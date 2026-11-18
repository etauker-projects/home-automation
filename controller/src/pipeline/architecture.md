Here's how the classes fit together. ★ = new, ✎ = modified, ○ = unchanged but wired in.

                          ┌──────────────────────────────┐
                          │ ✎ index.ts (composition root) │
                          │  builds real deps, calls      │
                          │  documentPipeline.start()     │
                          └──────┬───────────────┬────────┘
              loads config       │               │ creates
        ┌────────────────────────┘               ▼
        ▼                          ┌─────────────────────────────────────┐
┌──────────────────────────────┐   │ ★ DocumentPipeline                  │
│ ★ loadPipelineDirectories()  │──▶│  config: { dirs, timing }           │
│   PIPELINE_DATA_ROOT         │   │  ─────────────────────────────────  │
│   → scans, consume, exports, │   │  start() / stop()                   │
│     nas, config              │   │  handleScannedFile(path)    step 1  │
├──────────────────────────────┤   │  syncIngestion()            step 2  │
│ ○ loadPipelineTimingConfig() │──▶│  runExport(trigger)         step 3  │
└──────────────────────────────┘   │  handleExportedFile(path)   step 4  │
                                   │  - recordDownloadSummary()          │
                                   │  - removeSupersededCopy()           │
                                   └──────────────────┬──────────────────┘
                                                      │ depends only on
                                                      ▼
   ★ document-pipeline.interfaces.ts (ports) ─────────────────────────────
   ┌────────────────┐ ┌───────────────┐ ┌───────────────┐ ┌────────────┐ ┌──────────────────┐ ┌──────────────────┐
   │DirectoryWatcher│ │ Scheduler     │ │ PipelineFiles │ │ NasBackup  │ │lineRecorder │
   │monitorDirectory│ │ cron()        │ │ moveFile      │ │ backupFile │ │ getLastDownloaded│ │ fileDetected ... │
   │                │ │ interval()    │ │ safeDelete ...│ │            │ │Ingestion    │
   └───────▲────────┘ └──────▲────────┘ └──────▲────────┘ └─────▲──────┘ └────────▲─────────┘ └────────▲─────────┘
           ┆ fits as-is      ┆ implements      ┆ fits as-is     ┆ fits as-   ┆ Pick<> of
   ┌───────┴──────────┐ ┌────┴──────────┐ ┌────┴─────────────┐ ┌┴───────────────┐ ┌┴─────────────────┐ ┌┴──────────────────┐
   │○ FileMonitoring- │ │★ NodeScheduler│ │○ FileSystem-     │ │✎ NasBacku │ │✎ PipelineTracker  │
   │  Service         │ │ setInterval   │ │  Service         │ │  Service       │ │  ector           │ │ + now?: () => Date│
   │  (chokidar)      │ │               │ │                  │ │ + optiona │ │ + newId?: () =>   │
   └──────────────────┘ └──────┬────────┘ └────────▲─────────┘ │   FileSystem-  │ │   manifest)      │ │     string        │
                               │ wraps             │ injected  │   Service─┘ └───────────────────┘
                        ┌──────▼────────┐          └───────────│ uses           │
                        │✎ CronService  │                      └───────┬──
                        │ catches async │                              │ options
                        │ handler errors│                      ┌───────▼──
                        │ (node-cron)   │                      │✎ BackupOptions │
                        └───────────────┘                      │ - concurr
                                                               │ - lockFileName │
                                                               └──────────

How to read it
- DocumentPipeline only knows about the six interfaces in the middle row. In tests you can swap each box in the bottom row for a fake.
- index.ts creates one FileSystemService and passes it both to the pipelinkupService.
- PaperlessConnector also gives PipelineTracker the Paperless inbox count it shows on the UI page. That link isn't drawn because it hasn't changed.
- Besides the pipeline, index.ts still uses paperless and the tracker direendpoints (/ui/pipeline/*, /ui/paperless/preview).