# Document pipeline tracking

`PipelineTracker` records what happens to every file in the document pipeline and shows it at `/ui/pipeline`.

```
scans/ ──move──▶ paperless-consume/ ──paperless ingests──▶ paperless ──export (cron)──▶ paperless-exports/ ──backup──▶ nas/
scanned          consume                                  paperless                    exported                       archived
```

## Code structure

- `document-pipeline.ts`: `DocumentPipeline` runs the steps. `handleScannedFile()`, `syncIngestion()`, `runExport()` and `handleExportedFile()` can each be called and awaited directly. `start()` connects them to the directory watchers, the export cron and the ingestion poll. `stop()` disconnects them again.
- `document-pipeline.interfaces.ts`: the interfaces it depends on (`DirectoryWatcher`, `Scheduler`, `PipelineFiles`, `NasBackup`, `PaperlessGateway`, `PipelineRecorder`). The production classes match them as-is. A test can pass in small fakes, so no chokidar, cron, network or NAS is needed.
- `node-scheduler.ts`: the production `Scheduler` (node-cron plus `setInterval`).
- `pipeline-tracker.service.ts`: `PipelineTracker`, the event history. `now` and `newId` can be passed in for deterministic timestamps and file IDs.
- `src/config/pipeline-directories.config.ts` / `pipeline-timing.config.ts`: directories and waiting periods, loaded from the environment.
- `src/index.ts` only builds the real dependencies and calls `documentPipeline.start()`.

## Events

| Type               | Stage      | Recorded when                                         |
|--------------------|------------|-------------------------------------------------------|
| `detected`         | `scanned`  | A file in `scans/` has finished writing               |
| `moved_to_consume` | `consume`  | The file was moved into `paperless-consume/`          |
| `ingested`         | `paperless`| Paperless finished consuming the file (polled from its tasks API) |
| `exported`         | `exported` | The paperless document was downloaded to the exports  |
| `re_exported`      | `exported` | A document edited in Paperless after export was downloaded again ("Updated in paperless", or "Path changed: old → new") |
| `backed_up`        | `archived` | The export was copied to the NAS and verified         |
| `backup_skipped`   | `archived` | An identical file was already on the NAS              |
| `superseded_removed` | `archived` | After a re-export under a new path was backed up, the old NAS copy was deleted |
| `error`            | any        | Any step failed (file ID `system` for run-level errors) |

Events are appended to `<config>/pipeline-events.jsonl`, one JSON object per line, and reloaded on startup.

## Waiting periods

All set by environment variables (see `.env.template`), validated at startup. An invalid value stops the controller with a clear error. The active values are logged as `[Pipeline] Timing: …`.

| Variable | Default | Controls |
|---|---|---|
| `SCAN_STABILITY_SECONDS` | 180 | How long a file in `scans/` must stay unchanged before it is moved to consume |
| `EXPORT_STABILITY_SECONDS` | 180 | How long a file in `paperless-exports/` must stay unchanged before NAS backup |
| `PAPERLESS_EXPORT_CRON` / `PAPERLESS_EXPORT_TIMEZONE` | `15 * * * *` / `Europe/Dublin` | When the Paperless export runs |
| `PAPERLESS_INGESTION_POLL_SECONDS` | 60 (min 5) | How often Paperless consume tasks are polled |
| `PAPERLESS_INBOX_CACHE_SECONDS` | 60 (0 = no cache) | How long the inbox count is cached |
| `PIPELINE_UI_REFRESH_SECONDS` | 5 | How often `/ui/pipeline` refreshes |

`PIPELINE_DATA_ROOT` (default `/app/data`) is the folder that holds `scans/`, `paperless-consume/`, `paperless-exports/`, `nas/` and `config/` inside the container.

## Ingestion

Every `PAPERLESS_INGESTION_POLL_SECONDS` (default 60s) the controller reads the newest `consume_file` tasks from Paperless (`GET /api/tasks/`; both the 3.x and 2.x response shapes are supported).
- **Successful task:** if it matches a tracked file waiting in `consume`, an `ingested` event is recorded with the new Paperless document ID. Documents added any other way (Paperless UI, email, or before tracking existed) are ignored here and appear once they're exported.
- **Failed task** (e.g. a duplicate): recorded as an `error` with stage `consume` and Paperless's message. A failure for an untracked file is only recorded if it finished after the controller started.
- **Duplicates:** each task ID is recorded once, including across restarts.

## Linking events to one file

- **Scan → export**: Paperless keeps the consumed file's name as `original_file_name`. That name is matched against the most recent scan with the same basename that is not yet linked. A document with no matching scan (e.g. a manual upload) gets the file ID `paperless-<id>`.
- **Scan → ingest**: the consume task's filename is matched to the oldest tracked file with that name waiting in `consume`. Once ingested, the export is linked by Paperless document ID instead of by filename.
- **Re-exports**: these are added to the existing history, matched by Paperless document ID.
- **Export → NAS**: matched by the export file path.

## Updated documents

A document edited in Paperless after export is downloaded again on the next export run, because its `modified` timestamp changed. Its NAS path comes from year / type / correspondent / account number / title.
- **Path unchanged:** the NAS copy is overwritten in place, after a verified copy.
- **Path changed:** the download manifest records the old path as `supersedes`. Once the new file is backed up, the old NAS copy is deleted, along with any folders left empty. It is never deleted if another document now uses that path.
- **Collisions:** if two different documents would map to the same path, the later one gets ` (#<paperless id>)` appended to its filename.

Known limitations:
- Stale copies left behind before this existed are not cleaned up.
- Documents that collided before this existed have already overwritten each other on the NAS.
- If a path changes twice within one backup window (`EXPORT_STABILITY_SECONDS`), the intermediate copy may be left behind.

## Retrying failed files

On `/ui/pipeline`, a file whose latest event is an `error` gets a retry button, in both the files and the errors table. It re-runs the stage that failed (`POST /ui/pipeline/files/:id/retry`, `DocumentPipeline.retry()`). The outcome is recorded in the file's history like a normal run.

| Failed stage | Button | Does |
|---|---|---|
| `scanned` | Retry move | Moves the scan to `paperless-consume/` again, under the same file ID |
| `paperless` | Retry export | Exports that one document from Paperless (`PaperlessConnector.downloadOne()`). This ignores the export window and the manifest's "already downloaded" check, and doesn't move `lastDownloaded`. Documents still in the Paperless inbox are skipped |
| `exported` | Retry backup | Backs the file in `paperless-exports/` up to the NAS again |

These can't be retried here:
- **Ingestion failures** (`consume`, e.g. duplicates) have to be fixed in Paperless. The error links to the Paperless tasks page.
- **Run-level errors** (file ID `system`): use **Run export now** instead, which runs the same export as the cron.

## Links to Paperless

Paperless document IDs on `/ui/pipeline` and `/ui/paperless` link to the document in Paperless. The stage cards link to Paperless's tasks page and inbox view. Links use `PAPERLESS_PUBLIC_URL`, which falls back to `PAPERLESS_URL`.

## Stage counts

`scanned`, `consume` and `exported` are live counts of the files in each directory. `.lock`, `.part` and dotfiles are skipped. `paperlessInbox` is the number of Paperless documents with any inbox-flagged tag (`is_in_inbox=true`, regardless of the tag's name). These are the same documents the export skips. It is read on demand, cached for `PAPERLESS_INBOX_CACHE_SECONDS` (default 60s), and the cache is cleared after each export run. `archivedTracked` counts the files with a backup event in the history. A count that can't be read shows as `null`.

## Backlog

- **Publish errors to MQTT**: subscribe to `PIPELINE_ERROR_EVENT` on the tracker and publish each event, e.g. to `home-automation/controller/pipeline/errors`. Search for `TODO(mqtt)`.
- **Skipped backups stay in exports**: when `NasBackupService` skips a file because an identical copy is already on the NAS, it doesn't delete the source. The file stays in `paperless-exports/`, inflates the `exported` count, and is re-checked on every restart.
- **Rotate the JSONL file** if it grows large. At current document volumes this isn't needed yet.
