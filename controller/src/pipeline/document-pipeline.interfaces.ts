/**
 * Ports of the DocumentPipeline: the narrow set of operations it needs from the outside world.
 *
 * Each one lists only what the pipeline actually calls, so a test fake is a few lines.
 * The production classes satisfy them structurally:
 *   DirectoryWatcher ← FileMonitoringService
 *   Scheduler        ← NodeScheduler
 *   PipelineFiles    ← FileSystemService
 *   NasBackup        ← NasBackupService
 *   PaperlessGateway ← PaperlessConnector
 *   PipelineRecorder ← PipelineTracker
 */
import type { BackupResult } from '../backup/backup.interfaces.js';
import type { DownloadSummary } from '../paperless/paperless.connector.js';
import type { PipelineDirectoriesConfig } from '../config/pipeline-directories.config.js';
import type { PipelineTimingConfig } from '../config/pipeline-timing.config.js';
import type { PaperlessTaskSource, PipelineTracker } from './pipeline-tracker.service.js';

export interface Stoppable {
    stop(): unknown | Promise<unknown>;
}

export interface WatchCallbacks {
    add?: (filePath: string) => void | Promise<void>;
    error?: (error: Error) => void | Promise<void>;
}

/** Subset of chokidar options used by the pipeline (structurally compatible with ChokidarOptions). */
export interface WatchOptions {
    ignoreInitial?: boolean;
    awaitWriteFinish?: {
        stabilityThreshold: number;
        pollInterval: number;
    };
}

export interface DirectoryWatcher {
    monitorDirectory(directory: string, callbacks: WatchCallbacks, options?: WatchOptions): Stoppable;
}

export interface Scheduler {
    /** Run `task` on a cron schedule. */
    cron(pattern: string, timezone: string, task: () => unknown | Promise<unknown>): Stoppable;
    /** Run `task` every `ms` milliseconds. */
    interval(ms: number, task: () => unknown | Promise<unknown>): Stoppable;
}

export interface PipelineFiles {
    /** Move a file into a directory, returning its new path. */
    moveFile(sourcePath: string, targetDirectory: string): Promise<string>;
    /** Path of `inner` relative to `outer`; throws if `inner` is outside `outer`. */
    getNestedRelativePath(outer: string, inner: string): string;
    safeDelete(filePath: string): Promise<void>;
    cleanupEmptyDirectories(startDir: string, rootDir: string): Promise<void>;
}

export interface NasBackup {
    backupFile(sourceFile: string): Promise<BackupResult>;
}

export interface PaperlessGateway extends PaperlessTaskSource {
    getLastDownloaded(): Promise<string>;
    download(changedSince: string): Promise<DownloadSummary>;
    /** Returns (and forgets) the relative NAS path superseded by the export at `exportRelativePath`, if any. */
    takeSupersededPath(exportRelativePath: string): Promise<string | undefined>;
}

export type PipelineRecorder = Pick<PipelineTracker,
    | 'fileDetected'
    | 'movedToConsume'
    | 'exported'
    | 'backedUp'
    | 'supersededRemoved'
    | 'error'
    | 'syncIngestion'
    | 'invalidatePaperlessCount'
>;

export interface DocumentPipelineConfig {
    dirs: PipelineDirectoriesConfig;
    timing: PipelineTimingConfig;
}

export interface DocumentPipelineDeps {
    watcher: DirectoryWatcher;
    scheduler: Scheduler;
    files: PipelineFiles;
    backup: NasBackup;
    paperless: PaperlessGateway;
    recorder: PipelineRecorder;
    logger?: Pick<Console, 'log' | 'error'>;
}

export type ExportTrigger = 'scheduled' | 'manual';
