/**
 * Stages of the document pipeline:
 *   scanned   → file landed in the printer scans directory
 *   consume   → moved to the paperless consume directory, awaiting ingestion
 *   paperless → ingested by paperless (may be awaiting manual review via "inbox" tag)
 *   exported  → downloaded from paperless into the exports directory, awaiting NAS backup
 *   archived  → backed up to the NAS
 */
export type PipelineStage = 'scanned' | 'consume' | 'paperless' | 'exported' | 'archived';

export type PipelineEventType =
    | 'detected'
    | 'moved_to_consume'
    | 'ingested'
    | 'exported'
    | 're_exported'
    | 'backed_up'
    | 'backup_skipped'
    | 'superseded_removed'
    | 'error';

export interface PipelineEvent {
    /** ISO timestamp */
    ts: string;
    /** Stable identifier linking all events of one document; 'system' for non-file errors */
    fileId: string;
    fileName: string;
    stage: PipelineStage;
    type: PipelineEventType;
    path?: string;
    /** Paperless document ID, once known (export stage onwards) */
    paperlessId?: number;
    /** Paperless consume task ID (ingested / ingestion error events), used for de-duplication */
    paperlessTaskId?: string;
    details?: string;
    error?: string;
}

/** Input to PipelineTracker.record() — fileId and ts are resolved by the tracker when omitted */
export type PipelineEventInput = Omit<PipelineEvent, 'ts' | 'fileId'> & { fileId?: string };

/**
 * How a file whose latest event is an error can be retried (re-running the stage that failed):
 *   move_to_consume → move the scan to paperless consume again
 *   export          → export the paperless document again
 *   backup          → back the exported file up to the NAS again
 * Ingestion failures (stage `consume`) are not retryable here: they have to be fixed in paperless.
 */
export type RetryAction = 'move_to_consume' | 'export' | 'backup';

export type RetryTarget =
    | { action: 'move_to_consume'; path: string }
    | { action: 'export'; paperlessId: number }
    | { action: 'backup'; path: string };

/** Error event as listed on the pipeline page */
export interface PipelineErrorSummary extends PipelineEvent {
    /** Set when this error is still the file's latest event and its stage can be retried */
    retryAction?: RetryAction;
}

export interface StageCounts {
    /** Files currently in the scans directory (incl. those still stabilising) */
    scanned: number | null;
    /** Files currently in the paperless consume directory */
    consume: number | null;
    /** Paperless documents tagged "inbox" (awaiting manual review before export) */
    paperlessInbox: number | null;
    /** Files currently in the exports directory awaiting NAS backup */
    exported: number | null;
    /** Distinct files recorded as backed up to the NAS */
    archivedTracked: number;
    /** Error events in the last 24h */
    errors24h: number;
    lastUpdated: string;
}

export interface PipelineFileSummary {
    fileId: string;
    fileName: string;
    stage: PipelineStage;
    lastEvent: PipelineEventType;
    lastEventAt: string;
    firstSeenAt: string;
    eventCount: number;
    hasError: boolean;
    paperlessId?: number;
    /** Set when the latest event is an error whose stage can be retried */
    retryAction?: RetryAction;
}

export interface PipelineDirectories {
    scans: string;
    consume: string;
    exports: string;
    config: string;
}
