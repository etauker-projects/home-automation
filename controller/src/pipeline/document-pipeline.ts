import path from 'node:path';
import type { DownloadSummary } from '../paperless/paperless.connector.js';
import type {
    DocumentPipelineConfig,
    DocumentPipelineDeps,
    ExportTrigger,
    RetryResult,
    Stoppable,
} from './document-pipeline.interfaces.js';
import { NotRetryableError } from './document-pipeline.interfaces.js';

const WATCH_POLL_INTERVAL_MS = 500;

/**
 * Orchestrates the document pipeline (see src/pipeline/README.md):
 *
 *   1. scans/             ──move──▶            paperless-consume/   handleScannedFile()
 *   2. paperless ingests the file                                  syncIngestion() (polled)
 *   3. paperless          ──export (cron)──▶   paperless-exports/   runExport()
 *   4. paperless-exports/ ──backup──▶          nas/                 handleExportedFile()
 *
 * All I/O goes through the injected ports, so every step can be called and awaited directly with fakes.
 * `start()` only wires the steps to the watchers and schedules.
 * The step methods record failures with the recorder and never throw (they resolve to false instead), except
 * `runExport()` / `exportDocument()`, which rethrow so a manual caller can report the failure.
 * `retry()` re-runs the stage a file failed at.
 */
export class DocumentPipeline {
    private readonly handles: Stoppable[] = [];
    private ingestionSyncRunning = false;
    private readonly log: Pick<Console, 'log' | 'error'>;

    constructor(
        private readonly config: DocumentPipelineConfig,
        private readonly deps: DocumentPipelineDeps,
    ) {
        this.log = deps.logger ?? console;
    }

    // -------------------------
    // LIFECYCLE
    // -------------------------

    /** Start the watchers, the export schedule and ingestion polling. */
    public start(): void {
        if (this.handles.length) return;
        const { dirs, timing } = this.config;
        const { watcher, scheduler, recorder } = this.deps;

        // Step 1: scans → consume
        this.handles.push(watcher.monitorDirectory(dirs.scans, {
            add: (filePath) => void this.handleScannedFile(filePath),
            error: (error) => {
                this.log.error(`Error monitoring ${dirs.scans}:`, error);
                recorder.error({ stage: 'scanned', error, details: `Directory monitor error (${dirs.scans})` });
            },
        }, {
            awaitWriteFinish: { stabilityThreshold: timing.scanStabilityMs, pollInterval: WATCH_POLL_INTERVAL_MS },
        }));

        // Step 2: detect paperless ingestion (success / failure) of files moved to consume
        void this.syncIngestion();
        this.handles.push(scheduler.interval(timing.ingestionPollMs, () => this.syncIngestion()));

        // Step 3: paperless → exports
        this.handles.push(scheduler.cron(timing.exportCron, timing.exportTimezone, async () => {
            try {
                await this.runExport('scheduled');
            } catch {
                // already logged and recorded by runExport
            }
        }));

        // Step 4: exports → NAS (also picks up files left over from before a restart)
        this.handles.push(watcher.monitorDirectory(dirs.exports, {
            add: (filePath) => void this.handleExportedFile(filePath),
            error: (error) => {
                this.log.error(`Error monitoring ${dirs.exports}:`, error);
                recorder.error({ stage: 'exported', error, details: `Directory monitor error (${dirs.exports})` });
            },
        }, {
            awaitWriteFinish: { stabilityThreshold: timing.exportStabilityMs, pollInterval: WATCH_POLL_INTERVAL_MS },
            ignoreInitial: false,
        }));
    }

    /** Stop all watchers and schedules. Steps already in progress are not cancelled. */
    public async stop(): Promise<void> {
        const handles = this.handles.splice(0);
        await Promise.allSettled(handles.map(async h => h.stop()));
    }

    // -------------------------
    // STEPS
    // -------------------------

    /**
     * Step 1: a file finished writing in the scans directory. Move it to paperless consume.
     * Pass `fileId` to retry a file that is already tracked instead of recording a new detection.
     * Resolves to true if the file was moved.
     */
    public async handleScannedFile(filePath: string, fileId?: string): Promise<boolean> {
        const { files, recorder } = this.deps;
        this.log.log(fileId ? `Retrying move to consume: ${filePath}` : `New file detected: ${filePath}`);
        fileId ??= recorder.fileDetected(filePath);

        try {
            const newPath = await files.moveFile(filePath, this.config.dirs.consume);
            this.log.log(`File moved to paperless consume directory: ${newPath}`);
            recorder.movedToConsume(fileId, newPath);
            return true;
        } catch (error) {
            this.log.error(`Error moving file to paperless consume directory: ${error}`);
            recorder.error({ stage: 'scanned', fileId, path: filePath, error, details: 'Move to paperless consume failed' });
            return false;
        }
    }

    /** Step 2: poll paperless consume tasks. Overlapping calls are skipped. */
    public async syncIngestion(): Promise<void> {
        if (this.ingestionSyncRunning) return;
        this.ingestionSyncRunning = true;
        try {
            await this.deps.recorder.syncIngestion(this.deps.paperless);
        } finally {
            this.ingestionSyncRunning = false;
        }
    }

    /**
     * Step 3: export documents changed in paperless since the last run into the exports directory.
     * Failures are logged and recorded, then rethrown.
     */
    public async runExport(trigger: ExportTrigger): Promise<DownloadSummary> {
        const { paperless, recorder } = this.deps;
        try {
            const changedSince = await paperless.getLastDownloaded();
            this.log.log(`Starting download of paperless documents since ${changedSince}...`);

            const summary = await paperless.download(changedSince);
            this.log.log(`Download complete: ${summary.successful}/${summary.total} successful`);
            this.recordDownloadSummary(summary);
            return summary;
        } catch (error) {
            this.log.error(`Error in ${trigger} paperless export:`, error);
            const details = trigger === 'manual' ? 'Manual paperless export run failed' : 'Scheduled paperless export run failed';
            recorder.error({ stage: 'paperless', error, details });
            throw error;
        }
    }

    /**
     * Step 3 for a single document: export it regardless of the export window (used for retries).
     * Failures are logged and recorded, then rethrown.
     */
    public async exportDocument(paperlessId: number): Promise<DownloadSummary> {
        const { paperless, recorder } = this.deps;
        try {
            this.log.log(`Exporting paperless document #${paperlessId}...`);
            const summary = await paperless.downloadOne(paperlessId);
            this.recordDownloadSummary(summary);
            return summary;
        } catch (error) {
            this.log.error(`Error exporting paperless document #${paperlessId}:`, error);
            recorder.error({ stage: 'paperless', paperlessId, error, details: 'Export from paperless failed' });
            throw error;
        }
    }

    /** Step 4: a file finished writing in the exports directory. Back it up to the NAS. Resolves to true if backed up. */
    public async handleExportedFile(filePath: string): Promise<boolean> {
        const { backup, recorder } = this.deps;
        this.log.log(`New file detected: ${filePath}`);

        try {
            const result = await backup.backupFile(filePath);
            this.log.log(`File backed up to NAS directory`, result);
            recorder.backedUp(result);
        } catch (error) {
            this.log.error(`Error backing up file to NAS directory: ${error}`);
            recorder.error({ stage: 'exported', path: filePath, error, details: 'NAS backup failed' });
            return false;
        }

        await this.removeSupersededCopy(filePath);
        return true;
    }

    /**
     * Re-run the stage a file failed at (see PipelineTracker.getRetryTarget()).
     * The outcome is recorded like a normal run; the result says whether it worked.
     * Throws NotRetryableError if the file is unknown or its latest event isn't a retryable error.
     */
    public async retry(fileId: string): Promise<RetryResult> {
        const target = this.deps.recorder.getRetryTarget(fileId);
        if (!target) {
            throw new NotRetryableError(`File ${fileId} has nothing to retry: it is unknown, not in an error state, or failed at a stage that can't be retried here`);
        }

        switch (target.action) {
            case 'move_to_consume': {
                const success = await this.handleScannedFile(target.path, fileId);
                return { action: target.action, success, message: success ? 'Moved to paperless consume' : 'Move to paperless consume failed again' };
            }
            case 'backup': {
                const success = await this.handleExportedFile(target.path);
                return { action: target.action, success, message: success ? 'Backed up to NAS' : 'NAS backup failed again' };
            }
            case 'export': {
                let summary: DownloadSummary;
                try {
                    summary = await this.exportDocument(target.paperlessId);
                } catch (error) {
                    return { action: target.action, success: false, message: `Export failed again: ${error instanceof Error ? error.message : error}` };
                }
                if (summary.skipped) {
                    return { action: target.action, success: false, message: `Document #${target.paperlessId} is still in the paperless inbox; review it in paperless first` };
                }
                const failure = summary.results.find(r => !r.success);
                return failure
                    ? { action: target.action, success: false, message: `Export failed again: ${failure.error ?? 'Unknown error'}` }
                    : { action: target.action, success: true, message: `Exported paperless document #${target.paperlessId}` };
            }
        }
    }

    // -------------------------
    // HELPERS
    // -------------------------

    private recordDownloadSummary(summary: DownloadSummary): void {
        const { recorder } = this.deps;
        recorder.invalidatePaperlessCount();
        for (const result of summary.results) {
            if (result.success && result.filePath) {
                recorder.exported({
                    paperlessId: result.document.paperlessId,
                    title: result.document.title,
                    originalFileName: result.document.originalFileName,
                    filePath: result.filePath,
                    reExport: result.reExport,
                    previousPath: result.previousPath,
                    relativePath: result.document.path,
                });
            } else {
                recorder.error({
                    stage: 'paperless',
                    paperlessId: result.document.paperlessId,
                    fileName: result.document.originalFileName ?? result.document.title,
                    error: result.error ?? 'Unknown download error',
                    details: 'Export from paperless failed',
                });
            }
        }
    }

    /** After a document updated in paperless is backed up under a new path, delete its old NAS copy. */
    private async removeSupersededCopy(exportFilePath: string): Promise<void> {
        const { files, paperless, recorder } = this.deps;
        const { exports, nas } = this.config.dirs;
        let oldAbsolute: string | undefined;
        try {
            const relative = files.getNestedRelativePath(exports, exportFilePath);
            const superseded = await paperless.takeSupersededPath(relative);
            if (!superseded) return;

            oldAbsolute = path.join(nas, superseded);
            files.getNestedRelativePath(nas, oldAbsolute); // guard against escaping the NAS root
            await files.safeDelete(oldAbsolute);
            await files.cleanupEmptyDirectories(path.dirname(oldAbsolute), nas);
            this.log.log(`Removed superseded NAS copy: ${oldAbsolute}`);
            recorder.supersededRemoved({ exportPath: exportFilePath, removedPath: oldAbsolute });
        } catch (error) {
            this.log.error(`Error removing superseded NAS copy for ${exportFilePath}:`, error);
            recorder.error({ stage: 'archived', path: oldAbsolute ?? exportFilePath, error, details: 'Removing superseded NAS copy failed' });
        }
    }
}
