/**
 * Retry of failed pipeline stages: PipelineTracker.getRetryTarget() and DocumentPipeline.retry().
 * Run with: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PipelineTracker } from './pipeline-tracker.service.js';
import { DocumentPipeline } from './document-pipeline.js';
import { NotRetryableError, type DocumentPipelineDeps } from './document-pipeline.interfaces.js';
import type { DownloadSummary, EnhancedResult } from '../paperless/paperless.connector.js';
import type { BackupResult } from '../backup/backup.interfaces.js';

const ROOT = '/data';
const dirs = {
    scans: `${ROOT}/scans`,
    consume: `${ROOT}/paperless-consume`,
    exports: `${ROOT}/paperless-exports`,
    nas: `${ROOT}/nas`,
};

async function setup(overrides: Partial<DocumentPipelineDeps> = {}) {
    const config = await mkdtemp(path.join(tmpdir(), 'pipeline-retry-'));
    let id = 0;
    const tracker = new PipelineTracker({ ...dirs, config }, undefined, { newId: () => `file-${++id}` });
    const calls: string[] = [];

    const deps: DocumentPipelineDeps = {
        watcher: { monitorDirectory: () => ({ stop: () => undefined }) },
        scheduler: { cron: () => ({ stop: () => undefined }), interval: () => ({ stop: () => undefined }) },
        files: {
            moveFile: async (source, target) => { calls.push(`move ${source}`); return path.join(target, path.basename(source)); },
            getNestedRelativePath: (outer, inner) => path.relative(outer, inner),
            safeDelete: async () => undefined,
            cleanupEmptyDirectories: async () => undefined,
        },
        backup: {
            backupFile: async (source): Promise<BackupResult> => {
                calls.push(`backup ${source}`);
                return { source, destination: source.replace(dirs.exports, dirs.nas), bytes: 1, sha256: 'abc', skipped: false } as BackupResult;
            },
        },
        paperless: {
            listConsumeTasks: async () => [],
            getLastDownloaded: async () => '1970-01-01',
            download: async () => summary([]),
            downloadOne: async (paperlessId) => {
                calls.push(`downloadOne ${paperlessId}`);
                return summary([{ document: doc(paperlessId), filePath: `${dirs.exports}/2026/doc-${paperlessId}.pdf`, success: true }]);
            },
            takeSupersededPath: async () => undefined,
        },
        recorder: tracker,
        logger: { log: () => undefined, error: () => undefined },
        ...overrides,
    };

    const pipeline = new DocumentPipeline({ dirs: { ...dirs, config } as any, timing: {} as any }, deps);
    const cleanup = async () => { await tracker.flush(); await rm(config, { recursive: true, force: true }); };
    return { tracker, pipeline, calls, cleanup };
}

function doc(paperlessId: number): EnhancedResult {
    return { paperlessId, title: `Doc ${paperlessId}`, tags: [], created: '2026-11-19', modified: '2026-11-19', inInbox: false, notes: [], customFields: {}, pageCount: 1, mimeType: 'application/pdf', path: `2026/doc-${paperlessId}.pdf` };
}

function summary(results: DownloadSummary['results'], skipped = 0): DownloadSummary {
    const successful = results.filter(r => r.success).length;
    return { total: results.length + skipped, successful, failed: results.length - successful, skipped, results };
}

test('a file whose latest event is not an error is not retryable', async () => {
    const { tracker, pipeline, cleanup } = await setup();
    const fileId = tracker.fileDetected(`${dirs.scans}/a.pdf`);
    assert.equal(tracker.getRetryTarget(fileId), undefined);
    assert.equal(tracker.getRetryTarget('unknown'), undefined);
    await assert.rejects(pipeline.retry(fileId), NotRetryableError);
    await cleanup();
});

test('failed move to consume is retried for the same file', async () => {
    let fail = true;
    const { tracker, pipeline, calls, cleanup } = await setup();
    // first attempt fails
    const original = (pipeline as any).deps.files.moveFile;
    (pipeline as any).deps.files.moveFile = async (s: string, t: string) => {
        if (fail) throw new Error('EACCES');
        return original(s, t);
    };
    await pipeline.handleScannedFile(`${dirs.scans}/a.pdf`);
    const [file] = tracker.listFiles();
    assert.equal(file.retryAction, 'move_to_consume');
    assert.equal(tracker.listErrors()[0].retryAction, 'move_to_consume');

    fail = false;
    const result = await pipeline.retry(file.fileId);
    assert.deepEqual({ action: result.action, success: result.success }, { action: 'move_to_consume', success: true });
    assert.deepEqual(calls, [`move ${dirs.scans}/a.pdf`]);

    const history = tracker.getHistory(file.fileId)!;
    assert.deepEqual(history.map(e => e.type), ['detected', 'error', 'moved_to_consume']);
    assert.equal(tracker.listFiles().length, 1, 'no new file is tracked for the retry');
    assert.equal(tracker.listFiles()[0].retryAction, undefined);
    assert.equal(tracker.listErrors()[0].retryAction, undefined, 'old errors are no longer retryable');
    await cleanup();
});

test('failed export of a document is retried with downloadOne', async () => {
    const { tracker, pipeline, calls, cleanup } = await setup();
    tracker.error({ stage: 'paperless', paperlessId: 265, fileName: '20261119-scan-162401.pdf', error: 'EACCES', details: 'Export from paperless failed' });
    const [file] = tracker.listFiles();
    assert.equal(file.fileId, 'paperless-265');
    assert.deepEqual(tracker.getRetryTarget(file.fileId), { action: 'export', paperlessId: 265 });

    const result = await pipeline.retry(file.fileId);
    assert.equal(result.success, true, result.message);
    assert.deepEqual(calls, ['downloadOne 265']);
    assert.equal(tracker.getHistory('paperless-265')!.at(-1)!.type, 'exported');
    await cleanup();
});

test('export retry reports failures and documents still in the inbox', async () => {
    let next: DownloadSummary | Error = summary([{ document: doc(7), success: false, error: 'EACCES' }]);
    const { tracker, pipeline, cleanup } = await setup();
    (pipeline as any).deps.paperless.downloadOne = async () => { if (next instanceof Error) throw next; return next; };
    tracker.error({ stage: 'paperless', paperlessId: 7, error: 'EACCES' });

    let result = await pipeline.retry('paperless-7');
    assert.deepEqual({ success: result.success, message: result.message }, { success: false, message: 'Export failed again: EACCES' });

    next = summary([], 1);
    result = await pipeline.retry('paperless-7');
    assert.equal(result.success, false);
    assert.match(result.message, /inbox/);

    next = new Error('paperless down');
    result = await pipeline.retry('paperless-7');
    assert.equal(result.success, false);
    assert.match(result.message, /paperless down/);
    assert.equal(tracker.getRetryTarget('paperless-7')?.action, 'export', 'still retryable');
    await cleanup();
});

test('failed NAS backup is retried for the export file', async () => {
    const { tracker, pipeline, calls, cleanup } = await setup();
    const exportPath = `${dirs.exports}/2026/doc.pdf`;
    tracker.exported({ paperlessId: 1, title: 'Doc', filePath: exportPath });
    tracker.error({ stage: 'exported', path: exportPath, error: 'EACCES', details: 'NAS backup failed' });
    const fileId = tracker.listFiles()[0].fileId;
    assert.deepEqual(tracker.getRetryTarget(fileId), { action: 'backup', path: exportPath });

    const result = await pipeline.retry(fileId);
    assert.equal(result.success, true);
    assert.deepEqual(calls, [`backup ${exportPath}`]);
    assert.equal(tracker.getHistory(fileId)!.at(-1)!.type, 'backed_up');
    await cleanup();
});

test('ingestion failures and run-level errors are not retryable per file', async () => {
    const { tracker, cleanup } = await setup();
    tracker.error({ stage: 'consume', fileId: 'paperless-task-1', error: 'Duplicate' });
    tracker.error({ stage: 'paperless', error: 'paperless down', details: 'Scheduled paperless export run failed' });
    assert.equal(tracker.getRetryTarget('paperless-task-1'), undefined);
    assert.equal(tracker.getRetryTarget('system'), undefined);
    assert.ok(tracker.listErrors().every(e => e.retryAction === undefined));
    await cleanup();
});
