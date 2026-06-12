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

// TODO: consider moving to separate controller / service
const oidcConfig: Configuration = await discovery(
    new URL(Extractor.extractString('AUTHENTIK_ISSUER_URL')),
    Extractor.extractString('AUTHENTIK_CLIENT_ID'),
    Extractor.extractString('AUTHENTIK_CLIENT_SECRET'),
);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const apiRoot = process.env.API_ROOT || '';

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
const DIR_PRINTER_PAPERLESS = '/app/data/scans';   // printer scans to paperless consume directory (monitored by this service)
const DIR_PAPERLESS_CONSUME = '/app/data/paperless-consume';   // paperless consume directory (paperless detects and processes files here)
const DIR_PAPERLESS_EXPORT = '/app/data/paperless-exports';    // paperless export directory (files processed by paperless are exported here)
const DIR_SYNOLOGY_DOCS = '/app/data/nas';       // doument storage on the NAS
const PAPERLESS_TOKEN = Extractor.extractString('PAPERLESS_TOKEN');

const paperless = new PaperlessConnector(DIR_PAPERLESS_EXPORT, PAPERLESS_TOKEN);

uiRouter.get('/home', async (req, res) => {

    if (!(req.session as any).accessToken) {
        return res.redirect('/ui/login');
    }

    res.send(`
        <h1>Home Page</h1>
        <p>You are logged in!</p>
        <nav>
            <a href="/ui/paperless">View Paperless Documents</a> |
            <a href="/auth/logout">Logout</a>
        </nav>
        <style>
            body {
                background-color: #121212;
                color: #e0e0e0;
                font-family: Arial, sans-serif;
            }
            nav {
                margin: 20px 0;
            }
            a {
                color: #64b5f6;
                text-decoration: none;
            }
            a:hover {
                text-decoration: underline;
            }
        </style>
    `);
});

uiRouter.get('/paperless', async (req, res) => {
    if (!(req.session as any).accessToken) {
        return res.redirect('/ui/login');
    }

    try {
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Paperless Documents</title>
                <style>
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        margin: 0 auto;
                    }
                    h1 {
                        color: #64b5f6;
                    }
                    nav {
                        margin: 20px 0;
                        padding-bottom: 20px;
                        border-bottom: 1px solid #333;
                    }
                    a {
                        color: #64b5f6;
                        text-decoration: none;
                    }
                    a:hover {
                        text-decoration: underline;
                    }
                    .table-container {
                        overflow-x: auto;
                        margin: 20px 0;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        background-color: #1e1e1e;
                        min-width: 1400px;
                    }
                    th, td {
                        padding: 12px;
                        text-align: left;
                        border-bottom: 1px solid #333;
                        vertical-align: top;
                    }
                    th {
                        background-color: #2a2a2a;
                        color: #64b5f6;
                        font-weight: bold;
                        position: sticky;
                        top: 0;
                        z-index: 10;
                    }
                    tr:hover {
                        background-color: #252525;
                    }
                    .info-box {
                        background-color: #1e1e1e;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                        border-left: 4px solid #64b5f6;
                    }
                    .action-buttons {
                        margin: 20px 0;
                        display: flex;
                        gap: 10px;
                        align-items: center;
                    }
                    .btn {
                        padding: 10px 20px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: bold;
                        transition: background-color 0.3s;
                    }
                    .btn-primary {
                        background-color: #64b5f6;
                        color: #121212;
                    }
                    .btn-primary:hover {
                        background-color: #42a5f5;
                    }
                    .btn-primary:disabled {
                        background-color: #424242;
                        cursor: not-allowed;
                    }
                    .btn-secondary {
                        background-color: #9575cd;
                        color: #121212;
                    }
                    .btn-secondary:hover {
                        background-color: #7e57c2;
                    }
                    .btn-secondary:disabled {
                        background-color: #424242;
                        cursor: not-allowed;
                    }
                    .status-message {
                        padding: 10px 15px;
                        border-radius: 4px;
                        margin: 10px 0;
                        display: none;
                    }
                    .status-message.success {
                        background-color: #1e1e1e;
                        border-left: 4px solid #4caf50;
                        color: #4caf50;
                    }
                    .status-message.error {
                        background-color: #1e1e1e;
                        border-left: 4px solid #f44336;
                        color: #f44336;
                    }
                    .status-message.loading {
                        background-color: #1e1e1e;
                        border-left: 4px solid #64b5f6;
                        color: #64b5f6;
                    }
                </style>
            </head>
            <body>
                <nav>
                    <a href="/ui/home">← Back to Home</a>
                </nav>
                <h1>Paperless Documents</h1>
                <div class="info-box">
                    <strong>Note:</strong> Raw data is logged to the browser console. Press F12 to open developer tools.
                </div>

                <div class="action-buttons">
                    <button id="previewBtn" class="btn btn-primary">Preview</button>
                    <button id="downloadBtn" class="btn btn-primary">Download</button>
                    <button id="exportBtn" class="btn btn-secondary">Export</button>
                </div>

                <div id="statusMessage" class="status-message"></div>

                <div id="tableContainer" class="table-container" style="display: none;">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Correspondent</th>
                                <th>Document Type</th>
                                <th>Tags</th>
                                <th>Created Date</th>
                                <th>Pages</th>
                                <th>Mime Type</th>
                                <th>Path</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            <!-- Documents will be loaded here -->
                        </tbody>
                    </table>
                </div>

                <script>
                    const statusMessage = document.getElementById('statusMessage');
                    const previewBtn = document.getElementById('previewBtn');
                    const downloadBtn = document.getElementById('downloadBtn');
                    const exportBtn = document.getElementById('exportBtn');
                    const tableContainer = document.getElementById('tableContainer');
                    const tableBody = document.getElementById('tableBody');

                    function showMessage(message, type) {
                        statusMessage.textContent = message;
                        statusMessage.className = 'status-message ' + type;
                        statusMessage.style.display = 'block';

                        if (type !== 'loading') {
                            setTimeout(() => {
                                statusMessage.style.display = 'none';
                            }, 5000);
                        }
                    }

                    function disableButtons() {
                        previewBtn.disabled = true;
                        downloadBtn.disabled = true;
                        exportBtn.disabled = true;
                    }

                    function enableButtons() {
                        previewBtn.disabled = false;
                        downloadBtn.disabled = false;
                        exportBtn.disabled = false;
                    }

                    previewBtn.addEventListener('click', async () => {
                        disableButtons();
                        showMessage('Loading documents...', 'loading');

                        try {
                            const response = await fetch('/ui/paperless/preview', {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            const data = await response.json();

                            if (response.ok && data.documents) {
                                // Clear existing rows
                                tableBody.innerHTML = '';

                                // Generate and insert new rows
                                data.documents.forEach(doc => {
                                    const tagsDisplay = doc.tags && doc.tags.length > 0
                                        ? doc.tags.join(', ')
                                        : '<em>None</em>';

                                    const row = document.createElement('tr');
                                    row.innerHTML = \`
                                        <td>\${doc.paperlessId || '<em>N/A</em>'}</td>
                                        <td>\${doc.title || '<em>N/A</em>'}</td>
                                        <td>\${doc.correspondent || '<em>N/A</em>'}</td>
                                        <td>\${doc.documentType || '<em>N/A</em>'}</td>
                                        <td>\${tagsDisplay}</td>
                                        <td>\${doc.created || '<em>N/A</em>'}</td>
                                        <td>\${doc.pageCount || 0}</td>
                                        <td>\${doc.mimeType || '<em>N/A</em>'}</td>
                                        <td>\${doc.path || '<em>N/A</em>'}</td>
                                    \`;
                                    tableBody.appendChild(row);
                                });

                                // Show the table
                                tableContainer.style.display = 'block';
                                showMessage(\`Loaded \${data.documents.length} documents\`, 'success');
                                console.log('Paperless Documents Data:', data.documents);
                            } else {
                                showMessage('Preview failed: ' + (data.error || 'Unknown error'), 'error');
                            }
                        } catch (error) {
                            showMessage('Preview failed: ' + error.message, 'error');
                        } finally {
                            enableButtons();
                        }
                    });

                    downloadBtn.addEventListener('click', async () => {
                        disableButtons();
                        showMessage('Downloading documents...', 'loading');

                        try {
                            const response = await fetch('/ui/paperless/download', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            const data = await response.json();

                            if (response.ok) {
                                const summary = \`Downloaded \${data.successful}/\${data.total} documents successfully. \${data.failed > 0 ? data.failed + ' failed.' : ''}\`;
                                showMessage(summary, data.failed > 0 ? 'error' : 'success');
                                console.log('Download Summary:', data);
                            } else {
                                showMessage('Download failed: ' + (data.error || 'Unknown error'), 'error');
                            }
                        } catch (error) {
                            showMessage('Download failed: ' + error.message, 'error');
                        } finally {
                            enableButtons();
                        }
                    });

                    exportBtn.addEventListener('click', async () => {
                        disableButtons();
                        showMessage('Exporting...', 'loading');

                        try {
                            const response = await fetch('/ui/paperless/export', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            });

                            const data = await response.json();

                            if (response.ok) {
                                showMessage(data.message || 'Export completed successfully!', 'success');
                            } else {
                                showMessage('Export failed: ' + (data.error || 'Unknown error'), 'error');
                            }
                        } catch (error) {
                            showMessage('Export failed: ' + error.message, 'error');
                        } finally {
                            enableButtons();
                        }
                    });

                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Error fetching paperless documents:', error);
        res.status(500).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Error</title>
                <style>
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                        padding: 20px;
                    }
                    .error {
                        color: #f44336;
                        background-color: #1e1e1e;
                        padding: 20px;
                        border-radius: 4px;
                        border-left: 4px solid #f44336;
                    }
                    a {
                        color: #64b5f6;
                        text-decoration: none;
                    }
                </style>
            </head>
            <body>
                <h1>Error Loading Paperless Documents</h1>
                <div class="error">
                    <p><strong>Error:</strong> ${error instanceof Error ? error.message : String(error)}</p>
                </div>
                <p><a href="/ui/home">← Back to Home</a></p>
            </body>
            </html>
        `);
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
        console.log('Fetching paperless documents...');
        const documents = await paperless.list();
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
        console.log('Starting download of paperless documents...');
        const summary = await paperless.download();
        console.log(`Download complete: ${summary.successful}/${summary.total} successful`);
        res.json({
            success: true,
            total: summary.total,
            successful: summary.successful,
            failed: summary.failed,
            results: summary.results
        });
    } catch (error) {
        console.error('Error in download endpoint:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : String(error)
        });
    }
});

// Export endpoint - placeholder that logs TODO
uiRouter.post('/paperless/export', async (req, res) => {
    if (!(req.session as any).accessToken) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        console.log('TODO: Implement export functionality');
        res.json({ success: true, message: 'Export placeholder executed (check backend logs)' });
    } catch (error) {
        console.error('Error in export endpoint:', error);
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
const backupService = new NasBackupService(
    DIR_PAPERLESS_EXPORT,
    DIR_SYNOLOGY_DOCS,
    {
        concurrency: 4,
        retries: 3,
        retryDelayMs: 2000,
        logger: {
            info: (msg: string) => console.log('[Backup]', msg),
            error: (msg: string, err?: any) => console.error('[Backup]', msg, err),
        }
    }
);
const fileSystem = new FileSystemService();

// Step 1 DONE: monitor DIR_PRINTER_PAPERLESS and move files to DIR_PAPERLESS_CONSUME
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

// Step 2 DONE: paperless ingests the files
// Step 3 TODO: export from paperless to DIR_PAPERLESS_EXPORT


// Step 4 DONE: monitor DIR_PAPERLESS_EXPORT and move files to DIR_SYNOLOGY_DOCS
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
