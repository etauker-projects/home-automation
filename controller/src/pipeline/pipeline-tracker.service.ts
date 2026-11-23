import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import type {
    PipelineDirectories,
    PipelineEvent,
    PipelineErrorSummary,
    PipelineEventInput,
    PipelineFileSummary,
    RetryTarget,
    PipelineStage,
    StageCounts,
} from './pipeline.interfaces.js';
import type { BackupResult } from '../backup/backup.interfaces.js';
import type { ConsumeTask } from '../paperless/paperless.connector.js';

export interface PaperlessInboxCounter {
    countInbox(): Promise<number>;
}

export interface PaperlessTaskSource {
    listConsumeTasks(): Promise<ConsumeTask[]>;
}

export interface PipelineTrackerOptions {
    /** History file name inside the config directory */
    fileName?: string;
    /** How long the paperless inbox count is cached (default 60s) */
    inboxCacheMs?: number;
    /** Clock (default: current time), injectable for deterministic tests */
    now?: () => Date;
    /** File ID generator (default: random UUID), injectable for deterministic tests */
    newId?: () => string;
}

const DEFAULT_INBOX_CACHE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Event name emitted for every recorded error event.
 * Deliberately not 'error': EventEmitter throws on unhandled 'error' events.
 */
export const PIPELINE_ERROR_EVENT = 'pipeline-error';

/**
 * Records the history of every file passing through the document pipeline
 * (scans → paperless-consume → paperless → paperless-exports → NAS).
 *
 * Events are appended to a JSONL file in the config directory and indexed in memory.
 * Recording never throws: history is best-effort and must not break the pipeline.
 *
 * TODO(mqtt): subscribe to PIPELINE_ERROR_EVENT and publish errors to MQTT
 * (e.g. topic home-automation/controller/pipeline/errors). See src/pipeline/README.md.
 */
export class PipelineTracker extends EventEmitter {
    private readonly logPath: string;
    private readonly events: PipelineEvent[] = [];
    private readonly byFileId = new Map<string, PipelineEvent[]>();
    private readonly byPath = new Map<string, string>();
    private readonly byPaperlessId = new Map<number, string>();
    /** Scanned files not yet linked to a paperless document, by basename (oldest first) */
    private readonly unlinkedByName = new Map<string, string[]>();
    private writeChain: Promise<void> = Promise.resolve();
    private paperlessCountCache?: { value: number; at: number };
    /** Paperless consume task IDs already recorded (rebuilt from history on init) */
    private readonly seenTaskIds = new Set<string>();
    private readonly startedAt: string;
    private readonly inboxCacheMs: number;
    private readonly now: () => Date;
    private readonly newId: () => string;

    constructor(
        private readonly dirs: PipelineDirectories,
        private readonly paperless?: PaperlessInboxCounter,
        options: PipelineTrackerOptions = {},
    ) {
        super();
        this.logPath = path.join(dirs.config, options.fileName ?? 'pipeline-events.jsonl');
        this.inboxCacheMs = options.inboxCacheMs ?? DEFAULT_INBOX_CACHE_MS;
        this.now = options.now ?? (() => new Date());
        this.newId = options.newId ?? randomUUID;
        this.startedAt = this.now().toISOString();
    }

    // -------------------------
    // LIFECYCLE
    // -------------------------

    /** Load existing history from disk. Call once before recording. */
    public async init(): Promise<void> {
        let content: string;
        try {
            content = await readFile(this.logPath, 'utf-8');
        } catch (err: any) {
            if (err?.code !== 'ENOENT') {
                console.error(`[Pipeline] Failed to read ${this.logPath}:`, err);
            }
            return;
        }

        let invalid = 0;
        for (const line of content.split('\n')) {
            if (!line.trim()) continue;
            try {
                this.index(JSON.parse(line) as PipelineEvent);
            } catch {
                invalid++;
            }
        }
        console.log(`[Pipeline] Loaded ${this.events.length} events for ${this.byFileId.size} files` +
            (invalid ? ` (${invalid} invalid lines skipped)` : ''));
    }

    // -------------------------
    // RECORDING
    // -------------------------

    /** A new file appeared in the scans directory. Returns the new file ID. */
    public fileDetected(filePath: string): string {
        const fileId = this.newId();
        this.record({ fileId, fileName: path.basename(filePath), stage: 'scanned', type: 'detected', path: filePath });
        return fileId;
    }

    public movedToConsume(fileId: string, newPath: string): void {
        this.record({ fileId, fileName: path.basename(newPath), stage: 'consume', type: 'moved_to_consume', path: newPath });
    }

    /** A paperless document was exported to the exports directory. */
    public exported(doc: {
        paperlessId: number;
        title: string;
        originalFileName?: string;
        filePath: string;
        /** The document had been exported before (updated in paperless) */
        reExport?: boolean;
        /** Previous relative export path, if it changed */
        previousPath?: string;
        /** Current relative export path (for display) */
        relativePath?: string;
    }): void {
        const fileId = this.resolvePaperlessFileId(doc.paperlessId, doc.originalFileName);
        const details = doc.reExport
            ? (doc.previousPath ? `Path changed: ${doc.previousPath} → ${doc.relativePath ?? path.basename(doc.filePath)}` : 'Updated in paperless')
            : (doc.originalFileName ? `"${doc.title}" (original: ${doc.originalFileName})` : `"${doc.title}"`);
        this.record({
            fileId,
            fileName: path.basename(doc.filePath),
            stage: 'exported',
            type: doc.reExport ? 're_exported' : 'exported',
            path: doc.filePath,
            paperlessId: doc.paperlessId,
            details,
        });
    }

    /** An older NAS copy superseded by the backed-up export at `exportPath` was deleted. */
    public supersededRemoved(input: { exportPath: string; removedPath: string }): void {
        this.record({
            fileId: this.lookupByPath(input.exportPath),
            fileName: path.basename(input.removedPath),
            stage: 'archived',
            type: 'superseded_removed',
            path: input.removedPath,
            details: 'Old NAS copy removed after the updated document was backed up',
        });
    }

    public backedUp(result: BackupResult): void {
        this.record({
            fileId: this.lookupByPath(result.source),
            fileName: path.basename(result.destination),
            stage: 'archived',
            type: result.skipped ? 'backup_skipped' : 'backed_up',
            path: result.destination,
            details: result.skipped ? 'Identical file already on NAS' : `${result.bytes} bytes, sha256 ${result.sha256.slice(0, 12)}…`,
        });
    }

    /**
     * Record an error. The file is resolved from fileId, paperlessId or path (in that order);
     * errors not tied to a file are recorded under the 'system' file ID.
     */
    public error(input: {
        stage: PipelineStage;
        error: unknown;
        fileId?: string;
        path?: string;
        paperlessId?: number;
        paperlessTaskId?: string;
        fileName?: string;
        details?: string;
    }): void {
        const fileId = input.fileId
            ?? (input.paperlessId !== undefined ? this.byPaperlessId.get(input.paperlessId) : undefined)
            ?? (input.path ? this.lookupByPath(input.path, false) : undefined)
            ?? (input.paperlessId !== undefined ? `paperless-${input.paperlessId}` : 'system');

        this.record({
            fileId,
            fileName: input.fileName ?? (input.path ? path.basename(input.path) : fileId),
            stage: input.stage,
            type: 'error',
            path: input.path,
            paperlessId: input.paperlessId,
            paperlessTaskId: input.paperlessTaskId,
            details: input.details,
            error: input.error instanceof Error ? input.error.message : String(input.error),
        });
    }

    /**
     * Poll paperless consume tasks and record 'ingested' / ingestion error events
     * for files moved into the consume directory. Never throws.
     *
     * - Successful tasks are only recorded when they match a tracked scan; documents added
     *   via the paperless UI / email (or before tracking existed) appear once exported instead.
     * - Failed tasks for untracked files are recorded only if they finished after startup,
     *   so historic failures are not replayed.
     */
    public async syncIngestion(source: PaperlessTaskSource): Promise<void> {
        let tasks: ConsumeTask[];
        try {
            tasks = await source.listConsumeTasks();
        } catch (err) {
            console.error('[Pipeline] Failed to fetch paperless consume tasks:', err instanceof Error ? err.message : err);
            return;
        }

        // oldest first, so files with the same name are matched in consumption order
        const finished = tasks
            .filter(t => (t.status === 'success' || t.status === 'failure') && !this.seenTaskIds.has(t.taskId))
            .sort((a, b) => (a.dateDone ?? '').localeCompare(b.dateDone ?? ''));

        for (const task of finished) {
            this.seenTaskIds.add(task.taskId);
            const fileId = this.findAwaitingIngestion(task.fileName, task.dateDone);

            if (task.status === 'success') {
                if (!fileId) continue;
                this.record({
                    fileId,
                    fileName: task.fileName,
                    stage: 'paperless',
                    type: 'ingested',
                    paperlessId: task.documentId,
                    paperlessTaskId: task.taskId,
                    details: task.documentId !== undefined ? `Ingested as paperless #${task.documentId}` : 'Ingested by paperless',
                });
            } else {
                if (!fileId && (!task.dateDone || task.dateDone < this.startedAt)) continue;
                this.error({
                    stage: 'consume',
                    fileId: fileId ?? `paperless-task-${task.taskId}`,
                    fileName: task.fileName,
                    paperlessTaskId: task.taskId,
                    error: task.error ?? 'Consumption failed',
                    details: 'Paperless ingestion failed',
                });
            }
        }
    }

    /**
     * Oldest unlinked scan with this name whose latest event is 'moved_to_consume' and which was
     * moved before the task finished (older tasks for a same-named file belong to earlier documents).
     */
    private findAwaitingIngestion(fileName: string, dateDone?: string): string | undefined {
        const queue = this.unlinkedByName.get(fileName) ?? [];
        return queue.find(id => {
            const last = this.byFileId.get(id)?.at(-1);
            return last?.type === 'moved_to_consume' && (!dateDone || last.ts <= dateDone);
        });
    }

    private record(input: PipelineEventInput): void {
        try {
            const event: PipelineEvent = {
                ts: this.now().toISOString(),
                fileId: input.fileId ?? this.newId(),
                ...stripUndefined(input),
            } as PipelineEvent;

            this.index(event);
            this.persist(event);

            if (event.type === 'error') {
                this.emit(PIPELINE_ERROR_EVENT, event);
            }
        } catch (err) {
            console.error('[Pipeline] Failed to record event:', err);
        }
    }

    private persist(event: PipelineEvent): void {
        const line = JSON.stringify(event) + '\n';
        this.writeChain = this.writeChain
            .then(async () => {
                await mkdir(path.dirname(this.logPath), { recursive: true });
                await appendFile(this.logPath, line, 'utf-8');
            })
            .catch((err) => console.error(`[Pipeline] Failed to write ${this.logPath}:`, err));
    }

    /** Resolves once all pending writes have been flushed (used for tests / shutdown). */
    public flush(): Promise<void> {
        return this.writeChain;
    }

    private index(event: PipelineEvent): void {
        this.events.push(event);

        const history = this.byFileId.get(event.fileId) ?? [];
        history.push(event);
        this.byFileId.set(event.fileId, history);

        if (event.path && event.type !== 'error') {
            this.byPath.set(path.resolve(event.path), event.fileId);
        }

        if (event.paperlessTaskId) {
            this.seenTaskIds.add(event.paperlessTaskId);
        }

        if (event.type === 'detected') {
            const queue = this.unlinkedByName.get(event.fileName) ?? [];
            queue.push(event.fileId);
            this.unlinkedByName.set(event.fileName, queue);
        }

        if (event.paperlessId !== undefined && event.type !== 'error') {
            this.byPaperlessId.set(event.paperlessId, event.fileId);
            this.unlink(event.fileId);
        }
    }

    // -------------------------
    // FILE ID RESOLUTION
    // -------------------------

    private resolvePaperlessFileId(paperlessId: number, originalFileName?: string): string {
        const known = this.byPaperlessId.get(paperlessId);
        if (known) return known;

        if (originalFileName) {
            // paperless keeps the consumed file's name; link to the most recent unlinked scan of that name
            const queue = this.unlinkedByName.get(originalFileName);
            const match = queue?.[queue.length - 1];
            if (match) return match;
        }

        return `paperless-${paperlessId}`;
    }

    private unlink(fileId: string): void {
        for (const [name, queue] of this.unlinkedByName) {
            const idx = queue.indexOf(fileId);
            if (idx === -1) continue;
            queue.splice(idx, 1);
            if (queue.length === 0) this.unlinkedByName.delete(name);
            return;
        }
    }

    private lookupByPath(filePath: string): string;
    private lookupByPath(filePath: string, fallback: false): string | undefined;
    private lookupByPath(filePath: string, fallback: boolean = true): string | undefined {
        const known = this.byPath.get(path.resolve(filePath));
        if (known || !fallback) return known;
        return `path-${path.resolve(filePath)}`;
    }

    // -------------------------
    // QUERIES
    // -------------------------

    public listFiles(limit: number = 50): PipelineFileSummary[] {
        const summaries: PipelineFileSummary[] = [];
        for (const [fileId, history] of this.byFileId) {
            if (fileId === 'system') continue;
            const last = history[history.length - 1];
            const latestNonError = [...history].reverse().find(e => e.type !== 'error');
            const paperlessId = [...history].reverse().find(e => e.paperlessId !== undefined)?.paperlessId;
            summaries.push({
                fileId,
                fileName: (latestNonError ?? last).fileName,
                stage: last.stage,
                lastEvent: last.type,
                lastEventAt: last.ts,
                firstSeenAt: history[0].ts,
                eventCount: history.length,
                hasError: last.type === 'error',
                ...(paperlessId !== undefined ? { paperlessId } : {}),
                ...retryActionOf(this.getRetryTarget(fileId)),
            });
        }
        return summaries
            .sort((a, b) => b.lastEventAt.localeCompare(a.lastEventAt))
            .slice(0, limit);
    }

    public getHistory(fileId: string): PipelineEvent[] | undefined {
        const history = this.byFileId.get(fileId);
        return history ? [...history] : undefined;
    }

    public listErrors(limit: number = 50, since?: Date): PipelineErrorSummary[] {
        const sinceIso = since?.toISOString();
        const errors: PipelineErrorSummary[] = [];
        for (let i = this.events.length - 1; i >= 0 && errors.length < limit; i--) {
            const event = this.events[i];
            if (sinceIso && event.ts < sinceIso) break;
            if (event.type !== 'error') continue;
            const isLatest = this.byFileId.get(event.fileId)?.at(-1) === event;
            errors.push({ ...event, ...(isLatest ? retryActionOf(this.getRetryTarget(event.fileId)) : {}) });
        }
        return errors;
    }

    /**
     * What retrying this file would do, or undefined if it can't be retried.
     * Only files whose latest event is an error are retryable; the failed stage decides the action.
     * Run-level errors (file ID 'system') are not retryable per file: run the export again instead.
     */
    public getRetryTarget(fileId: string): RetryTarget | undefined {
        if (fileId === 'system') return undefined;
        const history = this.byFileId.get(fileId);
        const last = history?.at(-1);
        if (!history || last?.type !== 'error') return undefined;

        switch (last.stage) {
            case 'scanned':
                return last.path ? { action: 'move_to_consume', path: last.path } : undefined;
            case 'paperless': {
                const paperlessId = last.paperlessId ?? [...history].reverse().find(e => e.paperlessId !== undefined)?.paperlessId;
                return paperlessId !== undefined ? { action: 'export', paperlessId } : undefined;
            }
            case 'exported':
                return last.path ? { action: 'backup', path: last.path } : undefined;
            default:
                return undefined;
        }
    }

    public async getStageCounts(): Promise<StageCounts> {
        const [scanned, consume, exported, paperlessInbox] = await Promise.allSettled([
            countFiles(this.dirs.scans),
            countFiles(this.dirs.consume),
            countFiles(this.dirs.exports),
            this.getPaperlessInboxCount(),
        ]);

        const archived = new Set<string>();
        for (const event of this.events) {
            if (event.type === 'backed_up' || event.type === 'backup_skipped') archived.add(event.fileId);
        }

        return {
            scanned: settled(scanned),
            consume: settled(consume),
            paperlessInbox: settled(paperlessInbox),
            exported: settled(exported),
            archivedTracked: archived.size,
            errors24h: this.listErrors(Number.MAX_SAFE_INTEGER, new Date(this.now().getTime() - DAY_MS)).length,
            lastUpdated: this.now().toISOString(),
        };
    }

    /** Drop the cached paperless inbox count, e.g. after an export run changed what's pending. */
    public invalidatePaperlessCount(): void {
        this.paperlessCountCache = undefined;
    }

    private async getPaperlessInboxCount(): Promise<number> {
        if (!this.paperless) throw new Error('Paperless not configured');
        const now = this.now().getTime();
        if (this.paperlessCountCache && now - this.paperlessCountCache.at < this.inboxCacheMs) {
            return this.paperlessCountCache.value;
        }
        const value = await this.paperless.countInbox();
        this.paperlessCountCache = { value, at: now };
        return value;
    }
}

// -------------------------
// HELPERS
// -------------------------

/** Recursively count regular files, ignoring dotfiles and lock / temp files. */
async function countFiles(dir: string): Promise<number> {
    const entries = await readdir(dir, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) {
            count += await countFiles(path.join(dir, entry.name));
        } else if (entry.isFile() && !entry.name.endsWith('.lock') && !entry.name.endsWith('.part')) {
            count++;
        }
    }
    return count;
}

function retryActionOf(target: RetryTarget | undefined): { retryAction?: RetryTarget['action'] } {
    return target ? { retryAction: target.action } : {};
}

function settled<T>(result: PromiseSettledResult<T>): T | null {
    return result.status === 'fulfilled' ? result.value : null;
}

function stripUndefined<T extends object>(obj: T): T {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}
