# Document pipeline tracking

`PipelineTracker` records what happens to every file in the document pipeline and shows it at `/ui/pipeline`.

```
scans/ ──move──▶ paperless-consume/ ──paperless ingests──▶ paperless ──export (cron)──▶ paperless-exports/ ──backup──▶ nas/
scanned          consume                                  paperless                    exported                       archived
```

## Events

| Type               | Stage      | Recorded when                                         |
|--------------------|------------|-------------------------------------------------------|
| `detected`         | `scanned`  | A file in `scans/` has finished writing               |
| `moved_to_consume` | `consume`  | The file was moved into `paperless-consume/`          |
| `ingested`         | `paperless`| Paperless finished consuming the file (polled from its tasks API) |
| `exported`         | `exported` | The paperless document was downloaded to the exports  |
| `backed_up`        | `archived` | The export was copied to the NAS and verified         |
| `backup_skipped`   | `archived` | An identical file was already on the NAS              |
| `error`            | any        | Any step failed (file ID `system` for run-level errors) |

Events are appended to `<config>/pipeline-events.jsonl`, one JSON object per line, and reloaded on startup.

## Ingestion

Every 60s the controller reads the newest `consume_file` tasks from Paperless (`GET /api/tasks/`; both the 3.x and 2.x response shapes are supported).
- **Successful task:** if it matches a tracked file waiting in `consume`, an `ingested` event is recorded with the new Paperless document ID. Documents added any other way (Paperless UI, email, or before tracking existed) are ignored here and appear once they're exported.
- **Failed task** (e.g. a duplicate): recorded as an `error` with stage `consume` and Paperless's message. A failure for an untracked file is only recorded if it finished after the controller started.
- **Duplicates:** each task ID is recorded once, including across restarts.

## Linking events to one file

- **Scan → export**: Paperless keeps the consumed file's name as `original_file_name`. That name is matched against the most recent scan with the same basename that is not yet linked. A document with no matching scan (e.g. a manual upload) gets the file ID `paperless-<id>`.
- **Scan → ingest**: the consume task's filename is matched to the oldest tracked file with that name waiting in `consume`. Once ingested, the export is linked by Paperless document ID instead of by filename.
- **Re-exports**: these are added to the existing history, matched by Paperless document ID.
- **Export → NAS**: matched by the export file path.

## Stage counts

`scanned`, `consume` and `exported` are live counts of the files in each directory. `.lock`, `.part` and dotfiles are skipped. `paperlessInbox` is the number of Paperless documents with any inbox-flagged tag (`is_in_inbox=true`, regardless of the tag's name). These are the same documents the export skips. It is read on demand, cached for 60s, and the cache is cleared after each export run. `archivedTracked` counts the files with a backup event in the history. A count that can't be read shows as `null`.

## Backlog

- **Publish errors to MQTT**: subscribe to `PIPELINE_ERROR_EVENT` on the tracker and publish each event, e.g. to `home-automation/controller/pipeline/errors`. Search for `TODO(mqtt)`.
- **Rotate the JSONL file** if it grows large. At current document volumes this isn't needed yet.
