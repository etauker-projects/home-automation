# Authentication Setup Guide

This guide explains how to configure and use the Authentik SSO authentication in your Angular application.

## Prerequisites

- Authentik instance running and accessible
- Application configured in Authentik with OpenID Connect provider
- Node.js and npm installed

## Environment Configuration

1. **Populate the `.env` file** with your Authentik configuration:

```env
# Authentik OpenID Connect Configuration
AUTHENTIK_ISSUER_URL=https://your-authentik-instance.com/application/o/your-app-slug/
AUTHENTIK_CLIENT_ID=your-client-id
AUTHENTIK_CLIENT_SECRET=your-client-secret
AUTHENTIK_REDIRECT_URI=https://your-app.com/auth/callback

# Session Configuration
SESSION_SECRET=your-random-secret-string-min-32-chars

# Optional: Set to 'production' for HTTPS-only cookies
NODE_ENV=development
```

2. **Generate a secure session secret**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Authentik Configuration

In your Authentik admin panel:

1. **Create an Application**:
   - Navigate to Applications → Create
   - Set a name and slug for your application
   - Select "OAuth2/OpenID Provider"

2. **Configure the Provider**:
   - **Client Type**: Confidential
   - **Authorization flow**: Authorization Code with PKCE
   - **Redirect URIs**: Add your callback URL (e.g., `https://your-app.com/auth/callback`)
   - **Scopes**: `openid`, `email`, `profile`
   - **Subject mode**: Based on User's ID
   - **Token validity**: Set appropriate values (e.g., Access token: 10 minutes, Refresh token: 30 days)

3. **Copy credentials**:
   - Copy the Client ID and Client Secret
   - Note the Issuer URL (usually ends with `/application/o/your-slug/`)

## Authentication Flow

### User Journey:

1. **Unauthenticated user visits `/ui/home`**
   - Server detects no session → Redirects to `/ui/login`

2. **User lands on `/ui/login`**
   - Server generates PKCE code verifier and challenge
   - Server stores them in session
   - Server redirects user to Authentik authorization page

3. **User authenticates with Authentik**
   - User enters credentials on Authentik
   - Authentik redirects back to `/auth/callback`

4. **Callback processing**
   - Server exchanges authorization code for tokens
   - Server validates PKCE code verifier and state
   - Server stores tokens in session
   - Server redirects to `/ui/home`

5. **User accesses protected pages**
   - Server checks for valid session
   - Angular app renders if authenticated
   - Logout link redirects to `/auth/logout`

### Protected Routes:
- `/ui/home` - Requires authentication
- Any other `/ui/*` routes (except login, logout, not-found)

### Public Routes:
- `/ui/login` - Login page
- `/ui/logout` - Logout page
- `/ui/not-found` - 404 page
- `/auth/*` - Auth endpoints

## Building and Running

### Development Mode:
```bash
npm run build
npm run serve:ssr:home-automation-controller
```

### Production Mode:
```bash
NODE_ENV=production npm run build
NODE_ENV=production npm run serve:ssr:home-automation-controller
```

## Testing

1. **Start the server**:
```bash
npm run build && npm run serve:ssr:home-automation-controller
```

2. **Test the flow**:
   - Visit `http://localhost:4000/ui/home`
   - You should be redirected to `/ui/login`
   - Then redirected to Authentik
   - After login, redirected back to `/ui/home`
   - Click "Logout" to end session

3. **Check logs**:
   - Server logs show authentication flow
   - OIDC configuration initialization
   - Login initiations
   - Token exchanges
   - Session management

## Troubleshooting

### "Authentication not configured"
- Ensure all environment variables in `.env` are set
- Check that `.env` file is in the correct directory
- Verify Authentik issuer URL is accessible

### Session not persisting
- Check `SESSION_SECRET` is set
- Verify cookies are being set (check browser dev tools)
- Ensure `trust proxy` is configured if behind a reverse proxy

### PKCE validation failed
- Check that session is persisting between requests
- Verify `saveUninitialized: true` in session config
- Check cookie settings (secure, sameSite)

### Redirect URI mismatch
- Ensure `AUTHENTIK_REDIRECT_URI` matches exactly what's configured in Authentik
- Include protocol (http/https) and full path
- No trailing slashes unless configured in Authentik

## Security Notes

1. **Session Secret**: Use a strong, random secret in production
2. **HTTPS**: Always use HTTPS in production (`NODE_ENV=production`)
3. **Secure Cookies**: Enabled automatically in production mode
4. **PKCE**: Implementation uses PKCE for enhanced security
5. **State Parameter**: CSRF protection via state parameter

## Architecture

### Server-Side Components:
- `server.ts` - Express server with session middleware and auth routes
- `auth.controller.ts` - Handles OAuth callback and logout
- Session middleware - Manages user sessions with tokens

### Client-Side Components:
- `login-page` - Simple loading page (server handles redirect)
- `home-page` - Protected page with logout link
- `logout-page` - Triggers server-side logout

### Authentication Middleware:
- Checks for valid session before serving Angular pages
- Redirects unauthenticated users to login
- Allows public routes without authentication
