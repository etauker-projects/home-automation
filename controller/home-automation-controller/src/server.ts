import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import {
  discovery,
  type Configuration,
} from 'openid-client';
import { AuthController } from './app/api/auth/auth.controller.js';
import { Extractor } from './app/api/framework/environment/extractor.js';
import { Server } from './app/api/framework/server/server.js';
import { LogFactory } from './app/api/framework/logs/log.module.js';

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

dotenvConfig();

const browserDistFolder = join(import.meta.dirname, '../browser');
const logger = LogFactory.makeService();

const server = new Server({
  apiRoot: '/api',
  port: Extractor.extractNumber('PORT') ?? 4000,
});

const app = server.getApp();
const angularApp = new AngularNodeAppEngine();

// Initialize OIDC configuration
let oidcConfig: Configuration | null = null;
let authController: AuthController | null = null;

await (async () => {
  oidcConfig = await discovery(
    new URL(Extractor.extractString('AUTHENTIK_ISSUER_URL')),
    Extractor.extractString('AUTHENTIK_CLIENT_ID'),
    Extractor.extractString('AUTHENTIK_CLIENT_SECRET'),
  );
  authController = AuthController.getInstance(oidcConfig);
  logger.info('OIDC configuration initialized successfully');
})();

app.use('/auth', authController!.getRouter('/auth'));
// app.use('/auth', authController!.getRouter('/auth'));

/**
 * Authentication middleware for protected routes
 */
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Allow public routes
  const publicRoutes = ['/ui/login', '/ui/not-found', '/auth'];
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    logger.trace('Allowing access to public route', '', { path: req.path });
    return next();
  }

  // Check if user has valid session with access token
  if (req.session.accessToken) {
    logger.trace('Already logged in', '', { path: req.path });
    return next();
  }

  // // Redirect to login for protected routes
  if (req.path.startsWith('/ui/') || req.path === '' || req.path === '/') {
    logger.trace('Unauthenticated access attempt to protected route, redrecting to login', '', { path: req.path });
    return res.redirect('/ui/login');
  }

  next();
};

// Apply authentication middleware to UI routes
app.use(requireAuth);

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
