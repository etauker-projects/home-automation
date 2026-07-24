import express from "express";
import {
    randomPKCECodeVerifier,
    calculatePKCECodeChallenge,
    buildAuthorizationUrl,
    discovery,
    type Configuration,
} from "openid-client";
import { Server } from './framework/server/server.js';
import { StatusController } from './status/status.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { Extractor } from './framework/environment/extractor.js';
import { FileMonitoringService } from './file-system/file-monitoring.service.js';
import { FileSystemService } from './file-system/file-system.service.js';
import { PaperlessConnector } from './paperless/paperless.connector.js';
import { NasBackupService } from './backup/nas-backup.service.js';
import { CronService } from './cron/cron.service.js';
import { PaperlessPage } from './ui/paperless.page.js';
import { HomePage } from './ui/home.page.js';
import { PowerMonitoringPage } from './ui/power-monitoring.page.js';

// TODO: consider moving to separate controller / service
const oidcConfig: Configuration = await discovery(
    new URL(Extractor.extractString('AUTHENTIK_ISSUER_URL')),
    Extractor.extractString('AUTHENTIK_CLIENT_ID'),
    Extractor.extractString('AUTHENTIK_CLIENT_SECRET'),
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
const PAPERLESS_TOKEN = Extractor.extractString('PAPERLESS_TOKEN');

const paperless = new PaperlessConnector(DIR_PAPERLESS_EXPORT, DIR_CONFIG, PAPERLESS_TOKEN);

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

        // TODO: consolidate with backup service
        fileSystem.moveFile(filePath, DIR_PAPERLESS_CONSUME)
            .then((newPath) => console.log(`File moved to paperless consume directory: ${newPath}`))
            .catch((error) => console.error(`Error moving file to paperless consume directory: ${error}`));
    }
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

        console.log({
            success: true,
            total: summary.total,
            successful: summary.successful,
            failed: summary.failed,
            skipped: summary.skipped,
            results: summary.results
        });
    } catch (error) {
        console.error('Error in download endpoint:', error);
    }
});

// Step 4: monitor DIR_PAPERLESS_EXPORT and move files to DIR_SYNOLOGY_DOCS
fileMonitor.monitorDirectory(DIR_PAPERLESS_EXPORT, {
    add: async (filePath) => {
        console.log(`New file detected: ${filePath}`);
        backupService.backupFile(filePath)
            .then((newPath) => console.log(`File backed up to NAS directory`, newPath))
            .catch((error) => console.error(`Error backing up file to NAS directory: ${error}`));
    }
}, {
    awaitWriteFinish: {
        stabilityThreshold: 180000,
        pollInterval: 500,
    },
    ignoreInitial: false,
});


server.start();

await new Promise(_resolve => {
    console.log(`Server running on https://localhost:${port}`);
    console.log(`Login at: https://controller.automation.etauker.com/ui/home`);
    // setTimeout(() => _resolve(null), 60000); // Stop server after 180 seconds for testing
});
