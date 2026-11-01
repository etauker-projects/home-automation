import express from "express";
import {
    randomPKCECodeVerifier,
    calculatePKCECodeChallenge,
    buildAuthorizationUrl,
    discovery,
    allowInsecureRequests,
    type Configuration,
} from "openid-client";
import { Server } from './framework/server/server.js';
import { StatusController } from './status/status.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { Extractor } from './framework/environment/extractor.js';
import { FileMonitoringService } from './file-system/file-monitoring.service.js';
import { FileSystemService } from './file-system/file-system.service.js';
import { PaperlessConnector, type DownloadSummary } from './paperless/paperless.connector.js';
import { NasBackupService } from './backup/nas-backup.service.js';
import { CronService } from './cron/cron.service.js';
import { PaperlessPage } from './ui/paperless.page.js';
import { HomePage } from './ui/home.page.js';
import { PowerMonitoringPage } from './ui/power-monitoring.page.js';
import { PowerMonitoringIngestionPage } from './ui/power-monitoring-ingestion.page.js';
import { PowerMonitoringService } from './power-monitoring/power-monitoring.service.js';
import { PowerMonitoringHassConnector } from './power-monitoring/power-monitoring.hass-connector.js';
import { PowerMonitoringProcessor } from './power-monitoring/power-monitoring.processor.js';
import { PowerMetric } from './power-monitoring/power-monitoring.interfaces.js';
import { PipelineTracker } from './pipeline/pipeline-tracker.service.js';
import { PipelinePage } from './ui/pipeline.page.js';

// TODO: consider moving to separate controller / service
const isProduction = process.env.NODE_ENV === 'production';
const issuerUrl = new URL(Extractor.extractString('AUTHENTIK_ISSUER_URL'));
const isInsecureIssuer = issuerUrl.protocol === 'http:';
if (isInsecureIssuer && isProduction) {
    throw new Error(`Refusing plain http AUTHENTIK_ISSUER_URL in production: ${issuerUrl.href}`);
}
const oidcConfig: Configuration = await discovery(
    issuerUrl,
    Extractor.extractString('AUTHENTIK_CLIENT_ID'),
    Extractor.extractString('AUTHENTIK_CLIENT_SECRET'),
    undefined,
    // plain http is only expected for the local dev stack (see local-dev/README.md)
    isInsecureIssuer ? { execute: [allowInsecureRequests] } : undefined,
);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const apiRoot = process.env.API_ROOT || '';
const logger = {
    info: (msg: string) => console.log('[Backup]', msg),
    error: (msg: string, err?: any) => console.error('[Backup]', msg, err),
}

const server = new Server({ port, apiRoot });
server.register('/status', StatusController.getInstance());
server.register('/auth', AuthController.getInstance(oidcConfig));

server.register('/', {
    getRouter: () => express.Router().get('', async (_req, res) => {
        res.redirect('/ui/home');
    }),
    stop: () => Promise.resolve(true)
});

const uiRouter = express.Router();

// Key directories:
const DIR_PRINTER_PAPERLESS = '/app/data/scans'   // printer scans to paperless consume directory (monitored by this service)
const DIR_PAPERLESS_CONSUME = '/app/data/paperless-consume'   // paperless consume directory (paperless detects and processes files here)
const DIR_PAPERLESS_EXPORT = '/app/data/paperless-exports'    // paperless export directory (files processed by paperless are exported here)
const DIR_SYNOLOGY_DOCS = '/app/data/nas'       // doument storage on the NAS
const DIR_CONFIG = '/app/data/config'   // configuration directory (stores manifests and other config files)
const PAPERLESS_URL = Extractor.extractString('PAPERLESS_URL', 'https://paperless.office.etauker.com');
const PAPERLESS_TOKEN = Extractor.extractString('PAPERLESS_TOKEN');
const paperless = new PaperlessConnector(PAPERLESS_URL, DIR_PAPERLESS_EXPORT, DIR_CONFIG, PAPERLESS_TOKEN);

// Pipeline tracking: per-file history + live stage counts (see src/pipeline/README.md)
const pipeline = new PipelineTracker(
    {
        scans: DIR_PRINTER_PAPERLESS,
        consume: DIR_PAPERLESS_CONSUME,
        exports: DIR_PAPERLESS_EXPORT,
        config: DIR_CONFIG,
    },
    paperless,
);
await pipeline.init();

// Detect paperless ingestion (success / failure) of files moved to the consume directory
const INGESTION_POLL_MS = 60_000;
let ingestionSyncRunning = false;
const syncIngestion = async () => {
    if (ingestionSyncRunning) return;
    ingestionSyncRunning = true;
    try {
        await pipeline.syncIngestion(paperless);
    } finally {
        ingestionSyncRunning = false;
    }
};
void syncIngestion();
setInterval(() => void syncIngestion(), INGESTION_POLL_MS);

function recordDownloadSummary(summary: DownloadSummary): void {
    pipeline.invalidatePaperlessCount();
    for (const result of summary.results) {
        if (result.success && result.filePath) {
            pipeline.exported({
                paperlessId: result.document.paperlessId,
                title: result.document.title,
                originalFileName: result.document.originalFileName,
                filePath: result.filePath,
            });
        } else {
            pipeline.error({
                stage: 'paperless',
                paperlessId: result.document.paperlessId,
                fileName: result.document.originalFileName ?? result.document.title,
                error: result.error ?? 'Unknown download error',
                details: 'Export from paperless failed',
            });
        }
    }
}

// Power monitoring directories
const DIR_POWER_MONITORING_INBOX = '/app/data/power-monitoring/inbox'        // CSV files from Home Assistant
const DIR_POWER_MONITORING_PROCESSED = '/app/data/power-monitoring/processed' // Processed JSON files
const DIR_POWER_MONITORING_METADATA = '/app/data/power-monitoring/metadata'   // Processing metadata
const powerMonitoring = new PowerMonitoringService(
    DIR_POWER_MONITORING_INBOX,
    DIR_POWER_MONITORING_PROCESSED,
    DIR_POWER_MONITORING_METADATA,
    true // debug mode
);

// HASS REST API connector — only initialised when both HASS_URL and HASS_TOKEN are set.
// Reads statistics from the Home Assistant REST API using a Long-Lived Access Token.
// No database file mount is required.
const HASS_URL   = process.env.HASS_URL;
const HASS_TOKEN = process.env.HASS_TOKEN;
const hassConnector = (HASS_URL && HASS_TOKEN)
    ? new PowerMonitoringHassConnector({
        baseUrl:  HASS_URL,
        token:    HASS_TOKEN,
        timezone: process.env.HASS_TIMEZONE ?? 'Europe/Dublin',
    })
    : null;
if (hassConnector) {
    console.log(`[power-monitoring] HASS API connector initialised (${HASS_URL})`);
} else {
    console.log('[power-monitoring] HASS API connector disabled (HASS_URL or HASS_TOKEN not set)');
}
const powerProcessor = new PowerMonitoringProcessor(
    DIR_POWER_MONITORING_INBOX,
    DIR_POWER_MONITORING_PROCESSED,
    DIR_POWER_MONITORING_METADATA
);

uiRouter.get('/home', async (req, res) => {
    if (!(req.session as any).accessToken) {
        return res.redirect('/ui/login');
    }

    res.send(HomePage.render());
});

uiRouter.get('/paperless', async (req, res) => {
    if (!(req.session as any).accessToken) {
        return res.redirect('/ui/login');
    }

    try {
        const lastDownloaded = await paperless.getLastDownloaded();
        res.send(PaperlessPage.render(lastDownloaded));
    } catch (error) {
        console.error('Error fetching paperless documents:', error);
        res.status(500).send(PaperlessPage.renderError(error instanceof Error ? error : String(error)));
    }
});

uiRouter.get('/power-monitoring', async (req, res) => {
    if (!(req.session as any).accessToken) {
        return res.redirect('/ui/login');
    }

    try {
        res.send(PowerMonitoringPage.render());
    } catch (error) {
        console.error('Error loading power monitoring page:', error);
        res.status(500).send(PowerMonitoringPage.renderError(error instanceof Error ? error : String(error)));
    }
});

// Power monitoring data API endpoint
// GET /ui/power-monitoring/data/:metric/:year         → monthly data
// GET /ui/power-monitoring/data/:metric/:year?month=MM → daily data
// GET /ui/power-monitoring/data/:metric/:year?month=MM&day=DD → hourly data
uiRouter.get('/power-monitoring/data/:metric/:year', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const { metric, year } = req.params;
        const { month, day } = req.query;

        // Validate metric
        const validMetrics: PowerMetric[] = ['running_cost', 'energy_usage', 'time_in_use'];
        if (!validMetrics.includes(metric as PowerMetric)) {
            res.status(400).json({ error: `Invalid metric. Must be one of: ${validMetrics.join(', ')}` });
            return;
        }

        const data = await powerMonitoring.getData({
            metric: metric as PowerMetric,
            year,
            month: month as string | undefined,
            day: day as string | undefined,
        });

        res.json(data);
    } catch (error) {
        console.error('Error fetching power monitoring data:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Get available years
uiRouter.get('/power-monitoring/years', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const years = await powerMonitoring.getAvailableYears();
        res.json({ years });
    } catch (error) {
        console.error('Error fetching available years:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Get available months for a year
uiRouter.get('/power-monitoring/months/:year', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const { year } = req.params;
        const months = await powerMonitoring.getAvailableMonths(year);
        res.json({ months });
    } catch (error) {
        console.error('Error fetching available months:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Get available days for a year and month
uiRouter.get('/power-monitoring/days/:year/:month', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const { year, month } = req.params;
        const days = await powerMonitoring.getAvailableDays(year, month);
        res.json({ days });
    } catch (error) {
        console.error('Error fetching available days:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Get available metrics
uiRouter.get('/power-monitoring/metrics', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const metrics = await powerMonitoring.getAvailableMetrics();
        res.json({ metrics });
    } catch (error) {
        console.error('Error fetching available metrics:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Process inbox files (admin endpoint)
uiRouter.post('/power-monitoring/process', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        await powerMonitoring.processInboxFiles();
        res.json({ success: true, message: 'Inbox files processed successfully' });
    } catch (error) {
        console.error('Error processing inbox files:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// List entities available in the HASS SQLite database
// GET /ui/power-monitoring/hass-entities
uiRouter.get('/power-monitoring/hass-entities', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    if (!hassConnector) {
        res.status(503).json({ error: 'HASS API connector not configured. Set HASS_URL and HASS_TOKEN environment variables.' });
        return;
    }

    try {
        const entities = await hassConnector.listEntities();
        res.json({ entities });
    } catch (error) {
        console.error('Error listing HASS entities:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// Sync from HASS SQLite database → processed JSON files
// POST /ui/power-monitoring/sync
// Body (optional): { year?: string, month?: string, day?: string }
// Default: syncs the current calendar month
uiRouter.post('/power-monitoring/sync', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    if (!hassConnector) {
        res.status(503).json({ error: 'HASS API connector not configured. Set HASS_URL and HASS_TOKEN environment variables.' });
        return;
    }

    try {
        const now = new Date();
        console.log(`[power-monitoring/sync] Request body:`, req.body);

        const year  = (req.body?.year  as string) ?? String(now.getFullYear());
        const month = (req.body?.month as string) ?? String(now.getMonth() + 1).padStart(2, '0');
        const day   = (req.body?.day   as string) ?? undefined;
        console.log(`[power-monitoring/sync] Syncing from HASS API: year=${year} month=${month} day=${day ?? 'all'}`);

        const entries = day
            ? await hassConnector.extractDay(year, month, day)
            : await hassConnector.extractMonth(year, month);
        console.log(`[power-monitoring/sync] Extracted ${entries.length} entries from HASS API`, entries);

        const sourceLabel = day
            ? `hass-sync-${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            : `hass-sync-${year}-${month.padStart(2, '0')}`;

        const outputs = await powerProcessor.saveEntries(entries, sourceLabel);

        const filesWritten = outputs.filter(o => o.data.length > 0).length;
        console.log(`[power-monitoring/sync] Wrote ${filesWritten} processed files`);

        res.json({
            success: true,
            entriesExtracted: entries.length,
            filesWritten,
            dateRange: {
                from: day ? `${year}-${month}-${day}` : `${year}-${month}-01`,
                to: day ? `${year}-${month}-${day}` : `${year}-${month} (end)`,
            },
        });
    } catch (error) {
        console.error('Error syncing from HASS DB:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// Power Monitoring Ingestion page
// GET /ui/power-monitoring/ingestion
uiRouter.get('/power-monitoring/ingestion', async (req, res) => {
    if (!(req.session as any).accessToken) {
        return res.redirect('/ui/login');
    }

    try {
        res.send(PowerMonitoringIngestionPage.render());
    } catch (error) {
        console.error('Error loading power monitoring ingestion page:', error);
        res.status(500).send(PowerMonitoringIngestionPage.renderError(error instanceof Error ? error : String(error)));
    }
});

// Ingestion statistics endpoint
// GET /ui/power-monitoring/ingestion/stats
// Returns file counts per directory and HASS connector status
uiRouter.get('/power-monitoring/ingestion/stats', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const { readdir } = await import('fs/promises');

        const [inboxFiles, processedFiles, metadataFiles] = await Promise.all([
            readdir(DIR_POWER_MONITORING_INBOX).catch(() => [] as string[]),
            readdir(DIR_POWER_MONITORING_PROCESSED).catch(() => [] as string[]),
            readdir(DIR_POWER_MONITORING_METADATA).catch(() => [] as string[]),
        ]);

        const inboxCount     = inboxFiles.filter(f => f.endsWith('.csv')).length;
        const processedCount = processedFiles.filter(f => f.endsWith('.json')).length;
        const metadataCount  = metadataFiles.filter(f => f.endsWith('.json')).length;

        let hassEntityCount = 0;
        if (hassConnector) {
            try {
                hassEntityCount = (await hassConnector.listEntities()).length;
            } catch {
                hassEntityCount = 0;
            }
        }

        res.json({
            inboxCount,
            processedCount,
            metadataCount,
            hassEnabled:     !!hassConnector,
            hassEntityCount,
        });
    } catch (error) {
        console.error('Error fetching ingestion stats:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

// Document pipeline page + data (polled by the page)
uiRouter.get('/pipeline', async (req, res) => {
    if (!(req.session as any).accessToken) {
        return res.redirect('/ui/login');
    }

    try {
        res.send(PipelinePage.render());
    } catch (error) {
        console.error('Error loading pipeline page:', error);
        res.status(500).send(PipelinePage.renderError(error instanceof Error ? error : String(error)));
    }
});

uiRouter.get('/pipeline/stats', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        res.json(await pipeline.getStageCounts());
    } catch (error) {
        console.error('Error fetching pipeline stats:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
});

uiRouter.get('/pipeline/files', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 500);
    res.json({ files: pipeline.listFiles(limit) });
});

uiRouter.get('/pipeline/files/:id', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const history = pipeline.getHistory(req.params.id);
    if (!history) {
        res.status(404).json({ error: 'File not found' });
        return;
    }
    res.json({ fileId: req.params.id, history });
});

uiRouter.get('/pipeline/errors', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 500);
    res.json({ errors: pipeline.listErrors(limit) });
});

uiRouter.get('/login', async (req, res) => {
    try {
        console.log('=== LOGIN DEBUG INFO ===');
        console.log('Request Protocol:', req.protocol);
        console.log('Request Secure:', req.secure);
        console.log('Incoming Session ID:', req.sessionID);
        console.log('Incoming Cookie Header:', req.get('Cookie'));

        // Generate PKCE code verifier and challenge
        const codeVerifier = randomPKCECodeVerifier();
        const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

        // Generate state for CSRF protection
        const state = randomPKCECodeVerifier();

        // Store code verifier and state in session
        req.session.codeVerifier = codeVerifier;
        req.session.state = state;

        // Build authorization URL
        const authUrl = buildAuthorizationUrl(oidcConfig, {
            redirect_uri: process.env.AUTHENTIK_REDIRECT_URI!,
            scope: "openid email profile entitlements",
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
            state: state,
        });

        console.log('Session ID after storing data:', req.sessionID);
        console.log('Session state stored:', state);
        console.log('Session codeVerifier stored:', codeVerifier);
        console.log('Redirecting to authorization URL:', authUrl.href);

        // Save session before redirecting
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                res.status(500).send('Session error: ' + err);
                return;
            }
            // Redirect user to the authorization URL
            res.redirect(authUrl.href);
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Login error: ' + error);
    }
}),

// Preview endpoint - fetches documents on demand
uiRouter.get('/paperless/preview', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const changedSince = await paperless.getLastDownloaded();
        console.log(`Fetching paperless documents from ${changedSince}...`);
        const documents = await paperless.list(changedSince);
        res.json({ success: true, documents });
    } catch (error) {
        console.error('Error fetching paperless documents:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Download endpoint - calls the download method to fetch all documents
uiRouter.post('/paperless/download', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const changedSince = await paperless.getLastDownloaded();
        console.log(`Starting download of paperless documents from ${changedSince}...`);

        const summary = await paperless.download(changedSince);
        console.log(`Download complete: ${summary.successful}/${summary.total} successful`);
        recordDownloadSummary(summary);

        res.json({
            success: true,
            total: summary.total,
            successful: summary.successful,
            failed: summary.failed,
            skipped: summary.skipped,
            results: summary.results
        });
    } catch (error) {
        console.error('Error in download endpoint:', error);
        pipeline.error({ stage: 'paperless', error, details: 'Manual paperless export run failed' });
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// TODO: move to a separate controller
server.register('/ui', {
    getRouter: () => uiRouter,
    stop: () => Promise.resolve(true)
});

/* Document Processing */

const fileMonitor = new FileMonitoringService();
const cronService = new CronService();
const backupService = new NasBackupService(
    DIR_PAPERLESS_EXPORT,
    DIR_SYNOLOGY_DOCS,
    {
        concurrency: 4,
        retries: 3,
        retryDelayMs: 2000,
        logger,
    }
);
const fileSystem = new FileSystemService();

// Step 1: monitor DIR_PRINTER_PAPERLESS and move files to DIR_PAPERLESS_CONSUME
fileMonitor.monitorDirectory(DIR_PRINTER_PAPERLESS, {
    add: async (filePath) => {
        console.log(`New file detected: ${filePath}`);
        const fileId = pipeline.fileDetected(filePath);

        // TODO: consolidate with backup service
        fileSystem.moveFile(filePath, DIR_PAPERLESS_CONSUME)
            .then((newPath) => {
                console.log(`File moved to paperless consume directory: ${newPath}`);
                pipeline.movedToConsume(fileId, newPath);
            })
            .catch((error) => {
                console.error(`Error moving file to paperless consume directory: ${error}`);
                pipeline.error({ stage: 'scanned', fileId, path: filePath, error, details: 'Move to paperless consume failed' });
            });
    },
    error: (error) => {
        console.error(`Error monitoring ${DIR_PRINTER_PAPERLESS}:`, error);
        pipeline.error({ stage: 'scanned', error, details: `Directory monitor error (${DIR_PRINTER_PAPERLESS})` });
    },
}, {
    awaitWriteFinish: {
        stabilityThreshold: 180000,
        pollInterval: 500,
    },
});

// Step 2: paperless ingests the files

// Step 3: export from paperless to DIR_PAPERLESS_EXPORT
// const cronPattern = '0 3 * * *'; // Every day at 3 AM (after testing)
const cronPattern = '15 * * * *'; // Hourly at the start of the hour (for now)
const timezone = 'Europe/Dublin';
cronService.schedule(cronPattern, timezone, async () => {
    try {
        const changedSince = await paperless.getLastDownloaded();
        console.log(`Starting download of paperless documents since ${changedSince}...`);

        const summary = await paperless.download(changedSince);
        console.log(`Download complete: ${summary.successful}/${summary.total} successful`);
        recordDownloadSummary(summary);

        console.log({
            success: true,
            total: summary.total,
            successful: summary.successful,
            failed: summary.failed,
            skipped: summary.skipped,
            results: summary.results
        });
    } catch (error) {
        console.error('Error in scheduled paperless export:', error);
        pipeline.error({ stage: 'paperless', error, details: 'Scheduled paperless export run failed' });
    }
});

// Step 4: monitor DIR_PAPERLESS_EXPORT and move files to DIR_SYNOLOGY_DOCS
fileMonitor.monitorDirectory(DIR_PAPERLESS_EXPORT, {
    add: async (filePath) => {
        console.log(`New file detected: ${filePath}`);
        backupService.backupFile(filePath)
            .then((result) => {
                console.log(`File backed up to NAS directory`, result);
                pipeline.backedUp(result);
            })
            .catch((error) => {
                console.error(`Error backing up file to NAS directory: ${error}`);
                pipeline.error({ stage: 'exported', path: filePath, error, details: 'NAS backup failed' });
            });
    },
    error: (error) => {
        console.error(`Error monitoring ${DIR_PAPERLESS_EXPORT}:`, error);
        pipeline.error({ stage: 'exported', error, details: `Directory monitor error (${DIR_PAPERLESS_EXPORT})` });
    },
}, {
    awaitWriteFinish: {
        stabilityThreshold: 180000,
        pollInterval: 500,
    },
    ignoreInitial: false,
});


server.start();

await new Promise(_resolve => {
    console.log(`Login at: ${new URL('/ui/home', Extractor.extractString('AUTHENTIK_REDIRECT_URI'))}`);
    // setTimeout(() => _resolve(null), 60000); // Stop server after 180 seconds for testing
});
