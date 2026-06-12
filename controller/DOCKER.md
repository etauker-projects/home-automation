# Docker Setup for Home Automation Controller

This directory contains Docker configurations for running the Home Automation Controller in both development and production environments.

## Files Overview

- **`dev.dockerfile`** - Development container with hot-reload
- **`prod.dockerfile`** - Production-optimized multi-stage build
- **`docker-compose.yml`** - Orchestration for both environments
- **`.dockerignore`** - Excludes unnecessary files from Docker context

## Quick Start

### Development Mode

```bash
# Build and start development container
docker compose --profile dev up --build

# Or run in detached mode
docker compose --profile dev up -d --build

# View logs
docker compose logs -f controller-dev

# Stop
docker compose --profile dev down
```

### Production Mode

```bash
# Build and start production container
docker compose --profile prod up --build -d

# View logs
docker compose logs -f controller-prod

# Stop
docker compose --profile prod down
```

## Environment Variables

Create a `.env` file in the `controller/` directory with the following variables:

```env
PORT=3000
AUTHENTIK_CLIENT_ID=your_client_id
AUTHENTIK_CLIENT_SECRET=your_client_secret
AUTHENTIK_ISSUER_URL=https://your-authentik-instance.com/application/o/your-app/
AUTHENTIK_REDIRECT_URI=http://localhost:3000/auth/callback
SESSION_SECRET=your_session_secret
PAPERLESS_TOKEN=your_paperless_token

DIR_PRINTER_PAPERLESS=/path/to/printer
DIR_PAPERLESS_CONSUME=/path/to/consume
DIR_PAPERLESS_EXPORT=/path/to/export
DIR_SYNOLOGY_DOCS=/path/to/docs
```

## Container Features

### Development Container
- ✅ Runs as `node` user (UID 1000) - no permission issues
- ✅ Hot-reload enabled via `tsx`
- ✅ Source code mounted as volume
- ✅ Debugging port exposed (9229)
- ✅ All dev dependencies installed

### Production Container
- ✅ Multi-stage build for smaller image
- ✅ Only production dependencies
- ✅ TypeScript compiled to JavaScript
- ✅ Non-root user for security
- ✅ Health check configured
- ✅ Optimized for performance

## Common Commands

```bash
# Rebuild without cache
docker compose --profile dev build --no-cache

# Execute commands in running container
docker compose exec controller-dev sh

# View container resource usage
docker stats home-automation-controller-dev

# Remove volumes (clean slate)
docker compose down -v

# Build specific service
docker compose build controller-dev
```

## Security Notes

### Non-Root User
Both containers run as the `node` user (UID 1000) for security. This means:
- ✅ Files created in mounted volumes will have proper ownership
- ✅ Container cannot affect host system files
- ✅ Follows Docker security best practices

### File Permissions
If you encounter permission issues:

```bash
# Check your user ID
id -u  # Should output 1000 for most Linux users

# If different, update the Dockerfile:
# Change USER node to use your UID
```

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process or change PORT in .env
PORT=3001
```

### Permission Denied Errors
```bash
# Ensure .env file is readable
chmod 644 .env

# Rebuild container
docker compose --profile dev up --build
```

### Hot Reload Not Working
```bash
# Verify volume mounts
docker compose config

# Ensure src/ directory is mounted
docker compose exec controller-dev ls -la /app/src
```

## Integration with Main Project

To integrate with the main `docker-compose.yml`:

```bash
# From project root
cd controller && docker compose --profile prod up -d

# Or add to main compose file
# Include controller/docker-compose.yml as a dependency
```

## Performance Tips

### Development
- Use named volumes for `node_modules` (already configured)
- Mount source code as read-only (`:ro`) where possible
- Limit log verbosity

### Production
- Set `NODE_ENV=production` (already configured)
- Use health checks for monitoring
- Configure resource limits if needed:

```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
```

## Next Steps

1. Copy `.env.template` to `.env` and fill in values
2. Run development container: `docker compose --profile dev up`
3. Access application at `http://localhost:3000`
4. For production deployment, update environment variables and run prod profile
