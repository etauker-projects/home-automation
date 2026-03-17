// WIP POC for authentik integration. Not currently used in the app.

import express from "express";
import session from "express-session";
import {
    discovery,
    randomPKCECodeVerifier,
    calculatePKCECodeChallenge,
    buildAuthorizationUrl,
    authorizationCodeGrant
} from "openid-client";
import { Server } from './server/server';


// Extend session type to include our custom properties
declare module 'express-session' {
    interface SessionData {
        codeVerifier: string;
        state: string;
    }
}

const oidcConfig = await discovery(
    new URL(process.env.AUTHENTIK_ISSUER_URL!),
    process.env.AUTHENTIK_CLIENT_ID!,
    process.env.AUTHENTIK_CLIENT_SECRET!,
);

console.log("OIDC client configured");
// }

// Initialize OIDC and start server
// await setupOIDC();

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const apiRoot = process.env.API_ROOT || '';

const server = new Server({ port, apiRoot });
server.app.set('trust proxy', 1);
server.app.use(
  session({
    name: "oidc-session",
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: true,  // Must be true to create session before redirect
    cookie: {
      secure: true,      // REQUIRED for HTTPS in production
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  })
);

server.register('/', {
    getRouter: () => express.Router().get('', async (req, res) => {
        res.send(`
            <h1>Welcome to OIDC Test App</h1>
            <a href="/login">Login with Authentik</a>
            <style>
                body {
                    background-color: #121212;
                    color: #e0e0e0;
                    font-family: Arial, sans-serif;
                }
            </style>
        `);
    }),
    stop: () => Promise.resolve(true)
});
server.register('/login', {
    getRouter: () => express.Router().get('', async (req, res) => {
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
                scope: "openid email profile",
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
    stop: () => Promise.resolve(true)
});
server.register('', {
    getRouter: () => express.Router().get('/callback', async (req, res) => {
        try {
            // Create a full URL from the request for authorizationCodeGrant
            // Use the actual protocol and host from the request (forwarded by reverse proxy)
            const protocol = req.protocol;
            const host = req.get('X-Forwarded-Host') || req.get('Host') || 'localhost';
            const currentUrl = new URL(req.url, `${protocol}://${host}`);

            console.log('=== CALLBACK DEBUG INFO ===');
            console.log('Callback URL:', currentUrl.href);
            console.log('Callback params:', Object.fromEntries(currentUrl.searchParams));
            console.log('Request Protocol:', req.protocol);
            console.log('Request Secure:', req.secure);
            console.log('X-Forwarded-Proto:', req.get('X-Forwarded-Proto'));
            console.log('X-Forwarded-Host:', req.get('X-Forwarded-Host'));
            console.log('Cookie Header:', req.get('Cookie'));
            console.log('Session ID:', req.sessionID);
            console.log('Session state from session:', req.session.state);
            console.log('Session codeVerifier from session:', req.session.codeVerifier ? 'present' : 'missing');
            console.log('Session object:', JSON.stringify(req.session, null, 2));

            // Exchange authorization code for tokens
            const tokenSet = await authorizationCodeGrant(
                oidcConfig,
                currentUrl,
                {
                    pkceCodeVerifier: req.session.codeVerifier!,
                    expectedState: req.session.state!,
                }
            );

            console.log('Token set received:', {
                access_token: tokenSet.access_token ? 'present' : 'missing',
                id_token: tokenSet.id_token ? 'present' : 'missing',
                refresh_token: tokenSet.refresh_token ? 'present' : 'missing',
            });

            // console.log('Token set:', tokenSet);

            // Clear session values
            delete req.session.codeVerifier;
            delete req.session.state;

            // Display success message
            // TODO: redirect to home page
            res.send(`
                <h1>Login Successful!</h1>
                <p>Access token received: ${tokenSet.access_token ? 'Yes' : 'No'}</p>
                <p>ID token received: ${tokenSet.id_token ? 'Yes' : 'No'}</p>
                <pre>${JSON.stringify(tokenSet, null, 2)}</pre>
                <br>
                <a href="/">Go back home</a>
                <style>
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                    }
                </style>
            `);
        } catch (error) {
            console.error('Error during callback:', error);

            // TODO: redirect to error page
            res.status(500).send(`
                <h1>Authentication Error</h1>
                <pre>${error}</pre>
                <br>
                <a href="/">Go back home</a>
                <style>
                    body {
                        background-color: #121212;
                        color: #e0e0e0;
                        font-family: Arial, sans-serif;
                    }
                </style>
            `);
        }
    }),
    stop: () => Promise.resolve(true)
});
server.start();

await new Promise(resolve => {
    console.log(`Server running on https://localhost:${port}`);
    console.log(`Login at: https://controller.automation.etauker.com/ui/home`);
    setTimeout(() => resolve(null), 60000); // Stop server after 180 seconds for testing
});