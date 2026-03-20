/* eslint-disable require-await */
import * as express from 'express';

import {
    authorizationCodeGrant,
    type Configuration
} from "openid-client";

import { ApiController, IResponse } from '../framework/api/api.module.js';
import { IController } from '../framework/server/controller.interface.js';

// Extend session type to include our custom properties
declare module 'express-session' {
    interface SessionData {
        codeVerifier: string;
        state: string;
        accessToken: string;
        idToken: string;
        refreshToken: string;
    }
}

export class AuthController extends ApiController implements IController {

    private static instance: AuthController;
    private prefix: string = '';

    constructor(private oidcConfig: Configuration) {
        super();

        // TODO: decode where to best put this
        // this.oidcConfig = discovery(
        //     new URL(Extractor.extractString('AUTHENTIK_ISSUER_URL')),
        //     Extractor.extractString('AUTHENTIK_CLIENT_ID'),
        //     Extractor.extractString('AUTHENTIK_CLIENT_SECRET'),
        // );

        // this.logger.info("AuthController initialized, OIDC configuration in progress...");
        // this.oidcConfig
        //     .then(client => this.logger.debug('OIDC client discovered:', 'startup', client))
        //     .catch(error => this.logger.error('Error during OIDC discovery:', 'startup', error));
    }

    // ===========================================
    //               STATIC FUNCTIONS
    // ===========================================
    public static getInstance(oidcConfig: Configuration): AuthController {
        if (!AuthController.instance) {
            AuthController.instance = new AuthController(oidcConfig);
        }
        return AuthController.instance;
    }


    // ===========================================
    //               PUBLIC FUNCTIONS
    // ===========================================
    public getRouter(prefix: string): express.Router {
        this.prefix = prefix;
        return this.registerEndpoints(this.router, prefix, [
            { method: 'get', endpoint: '/callback', handler: this.onAuthenticated },
            { method: 'get', endpoint: '/logout', handler: this.logout },
        ]);
    }

    public async logout(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<void | IResponse<any>> {

        req.session.destroy(err => {
            if (err) {
                console.error('Error destroying session during logout:', err);
            } else {
                console.log('Session destroyed successfully');
            }
        });

        res.redirect('https://auth.security.etauker.com/application/o/home-automation-controller/end-session/');
        return;
    }

    public async onAuthenticated(
        endpoint: string,
        req: express.Request,
        res: express.Response,
    ): Promise<void | IResponse<any>> {
        try {
            // Create a full URL from the request for authorizationCodeGrant
            // Use the actual protocol and host from the request (forwarded by reverse proxy)
            const protocol = req.protocol;
            const host = req.get('X-Forwarded-Host') || req.get('Host') || 'localhost';
            const currentUrl = new URL(this.prefix + req.url, `${protocol}://${host}`);

            // Clean up and enable under debug
            // console.log('=== CALLBACK DEBUG INFO ===');
            // console.log('Callback URL:', currentUrl.href);
            // console.log('Callback params:', Object.fromEntries(currentUrl.searchParams));
            // console.log('Request Protocol:', req.protocol);
            // console.log('Request Secure:', req.secure);
            // console.log('X-Forwarded-Proto:', req.get('X-Forwarded-Proto'));
            // console.log('X-Forwarded-Host:', req.get('X-Forwarded-Host'));
            // console.log('Cookie Header:', req.get('Cookie'));
            // console.log('Session ID:', req.sessionID);
            // console.log('Session state from session:', req.session.state);
            // console.log('Session codeVerifier from session:', req.session.codeVerifier ? 'present' : 'missing');
            // console.log('Session object:', JSON.stringify(req.session, null, 2));

            // Exchange authorization code for tokens
            const tokenSet = await authorizationCodeGrant(
                this.oidcConfig,
                currentUrl,
                {
                    pkceCodeVerifier: req.session.codeVerifier!,
                    expectedState: req.session.state!,
                }
            );

            // Clean up and enable under debug
            console.log('Token set received:', {
                access_token: tokenSet.access_token ? 'present' : 'missing',
                id_token: tokenSet.id_token ? 'present' : 'missing',
                refresh_token: tokenSet.refresh_token ? 'present' : 'missing',
            });

            req.session.accessToken = tokenSet.access_token;
            req.session.idToken = tokenSet.id_token;
            req.session.refreshToken = tokenSet.refresh_token;

            // console.log('Token set:', tokenSet);

            // Clear session values
            delete req.session.codeVerifier;
            delete req.session.state;

            res.redirect('/ui/home');

        } catch (error) {
            console.error('Error during callback:', error);

            // TODO: redirect to proper error page
            return { status: 500, body: `
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
            `};
        }
    }
}
