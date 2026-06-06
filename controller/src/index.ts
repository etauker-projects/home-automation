import express from "express";
import {
    randomPKCECodeVerifier,
    calculatePKCECodeChallenge,
    buildAuthorizationUrl,
    discovery,
    type Configuration,
} from "openid-client";
import { Server } from './framework/server/server';
import { StatusController } from './status/status.controller';
import { AuthController } from './auth/auth.controller';
import { Extractor } from './framework/environment/extractor';
import { FileMonitoringService } from './file-system/file-monitoring.service.ts';
import { FileSystemService } from './file-system/file-system.service.ts';

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
    getRouter: () => express.Router().get('', async (req, res) => {
        res.redirect('/ui/home');
    }),
    stop: () => Promise.resolve(true)
});

const uiRouter = express.Router();

uiRouter.get('/home', async (req, res) => {

    if (!(req.session as any).accessToken) {
        return res.redirect('/ui/login');
    }

    res.send(`
        <h1>Home Page</h1>
        <p>You are logged in!</p>
        <a href="/auth/logout">Logout</a>
        <style>
            body {
                background-color: #121212;
                color: #e0e0e0;
                font-family: Arial, sans-serif;
            }
        </style>
    `);
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
                return res.status(500).send('Session error: ' + err);
            }
            // Redirect user to the authorization URL
            res.redirect(authUrl.href);
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Login error: ' + error);
    }
}),

// TODO: move to a separate controller
server.register('/ui', {
    getRouter: () => uiRouter,
    stop: () => Promise.resolve(true)
});

/* Document Processing */

// Key directories:
const DIR_PRINTER_PAPERLESS = Extractor.extractString('DIR_PRINTER_PAPERLESS');   // printer scans to paperless consume directory (monitored by this service)
const DIR_PAPERLESS_CONSUME = Extractor.extractString('DIR_PAPERLESS_CONSUME');   // paperless consume directory (paperless detects and processes files here)
const DIR_PAPERLESS_EXPORT = Extractor.extractString('DIR_PAPERLESS_EXPORT');    // paperless export directory (files processed by paperless are exported here)
const DIR_SYNOLOGY_DOCS = Extractor.extractString('DIR_SYNOLOGY_DOCS');       // doument storage on the NAS

const fileMonitor = new FileMonitoringService();
const fileSystem = new FileSystemService();

// Step 1: monitor DIR_PRINTER_PAPERLESS and move files to DIR_PAPERLESS_CONSUME
fileMonitor.monitorDirectory(DIR_PRINTER_PAPERLESS, {
    add: async (filePath) => {
        console.log(`New file detected: ${filePath}`);
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
// Step 4: monitor DIR_PAPERLESS_EXPORT and move files to DIR_SYNOLOGY_DOCS

server.start();

await new Promise(resolve => {
    console.log(`Server running on https://localhost:${port}`);
    console.log(`Login at: https://controller.automation.etauker.com/ui/home`);
    setTimeout(() => resolve(null), 60000); // Stop server after 180 seconds for testing
});