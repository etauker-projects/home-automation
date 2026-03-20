import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import session from 'express-session';
import { join } from 'node:path';
import { config as dotenvConfig } from 'dotenv';
import {
  discovery,
  randomPKCECodeVerifier,
  calculatePKCECodeChallenge,
  buildAuthorizationUrl,
  type Configuration,
} from 'openid-client';
import { AuthController } from './app/api/auth/auth.controller.js';
import { Extractor } from './app/api/framework/environment/extractor.js';
import { Server } from './app/api/framework/server/server.js';

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

// Load environment variables
dotenvConfig();

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Configure session middleware
app.set('trust proxy', 1);
app.use(
  session({
    name: 'oidc-session',
    secret: Extractor.extractString('SESSION_SECRET'),
    resave: false,
    saveUninitialized: true, // Must be true to create session before redirect
    cookie: {
      secure: process.env['NODE_ENV'] === 'production', // HTTPS only in production
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Initialize OIDC configuration
let oidcConfig: Configuration | null = null;
let authController: AuthController | null = null;

(async () => {
  try {
      oidcConfig = await discovery(
        new URL(Extractor.extractString('AUTHENTIK_ISSUER_URL')),
        Extractor.extractString('AUTHENTIK_CLIENT_ID'),
        Extractor.extractString('AUTHENTIK_CLIENT_SECRET'),
      );
      authController = AuthController.getInstance(oidcConfig);
      console.log('OIDC configuration initialized successfully');
  } catch (error) {
    console.error('Failed to initialize OIDC configuration:', error);
  }
})();

// TODO: integrate
// const server = new Server();

/**
 * Authentication routes
 */
// // Login initiation route
// app.get('/ui/login', async (req, res, next) => {
//   try {

//     if (!oidcConfig) {
//       return res.redirect('/ui/unexpected-error?message=Authentication%20not%20configured');
//       // return res.status(500).send('Authentication not configured');
//     }

//     // Generate PKCE code verifier and challenge
//     const codeVerifier = randomPKCECodeVerifier();
//     const codeChallenge = await calculatePKCECodeChallenge(codeVerifier);

//     // Generate state for CSRF protection
//     const state = randomPKCECodeVerifier();

//     // Store code verifier and state in session
//     req.session.codeVerifier = codeVerifier;
//     req.session.state = state;

//     // Build authorization URL
//     const authUrl = buildAuthorizationUrl(oidcConfig, {
//       redirect_uri: process.env['AUTHENTIK_REDIRECT_URI']!,
//       scope: 'openid email profile entitlements',
//       code_challenge: codeChallenge,
//       code_challenge_method: 'S256',
//       state: state,
//     });

//     console.log('Initiating login, redirecting to:', authUrl.href);

//     // Save session before redirecting
//     req.session.save((err) => {
//       if (err) {
//         console.error('Session save error:', err);
//         return res.status(500).redirect('/ui/unexpected-error?message=Session%20save%20failed');
//       }
//       // Redirect user to the authorization URL
//       // return res.status(500).redirect('/ui/unexpected-error?message=Session%20save%20failed');
//       return res.redirect(authUrl.href);
//     });
//   } catch (error) {
//     console.error('Error during login initiation:', error);
//     return next(error);
//   }
// });

// // Register auth controller routes (callback and logout)
// app.use('/auth', (req, res, next) => {
//   if (!authController) {
//     return res.status(500).send('Authentication not configured');
//   }
//   return authController.getRouter('/auth')(req, res, next);
// });

/**
 * Authentication middleware for protected routes
 */
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Allow public routes
  const publicRoutes = ['/ui/login', '/ui/logout', '/ui/not-found', '/auth'];
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  // Check if user has valid session with access token
  if (req.session.accessToken) {
    return next();
  }

  // Redirect to login for protected routes
  if (req.path.startsWith('/ui/')) {
    console.log('Redirecting unauthenticated user to login');
    // return res.redirect('/ui/login');
    return res.redirect('/ui/login?message=Please%20log%20in%20to%20access%20this%20page');
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
