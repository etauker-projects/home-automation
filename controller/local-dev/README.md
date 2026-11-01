# Local dev stack

Runs the controller against local, pre-seeded Authentik and Paperless instances. Nothing needs configuring by hand.

```bash
npm run local:up        # controller-dev (hot reload) + Authentik + Paperless
npm run local:up:prod   # same, but with the production image
npm run local:down      # stop everything and wipe all local state
```

First boot takes ~2 minutes (Authentik migrations + blueprint). The controller starts once Authentik is healthy and the Paperless token has been created.

| Service    | URL                          | Login                            |
|------------|------------------------------|----------------------------------|
| Controller | http://localhost:8875        | `dev` / `dev` (via Authentik)    |
| Authentik  | http://auth.localhost:9000   | `akadmin` / `admin`              |
| Paperless  | http://localhost:8000        | `admin` / `admin`                |

All values live in [`.env.local`](.env.local) and are dev-only.

## What gets seeded

- **Authentik**: `akadmin` from the `AUTHENTIK_BOOTSTRAP_*` vars. [`authentik/blueprints/controller-dev.yaml`](authentik/blueprints/controller-dev.yaml) adds the `dev` user plus the `home-automation-controller` OIDC provider and app, with the fixed client ID and secret from `.env.local`.
- **Paperless**: `admin` from `PAPERLESS_ADMIN_*`. The one-shot `paperless-init` service ([`paperless/init.py`](paperless/init.py)) creates the fixed API token (`PAPERLESS_TOKEN`) and queues the PDFs in `paperless/sample-docs/` for consumption, if no documents exist yet. It also creates an `inbox` tag flagged as Paperless's inbox tag. Newly consumed documents get it automatically and aren't exported until it is removed. Sample documents consumed before the tag existed stay untagged. `npm run local:up` re-runs the seed on an existing stack.

## Notes

- **`auth.localhost`**: the browser and the controller container must use the same issuer URL. Chrome and Firefox resolve `*.localhost` to 127.0.0.1; inside Docker it's a network alias of the Authentik container. If your browser doesn't resolve it (e.g. Safari), add `127.0.0.1 auth.localhost` to `/etc/hosts`.
- All controller folders live under `local-dev/mnt/` (git-ignored), set by the `DIR_*` vars in `.env.local`:
  - `scans/` → drop a PDF here; after ~3 min the controller moves it to `paperless-consume/`
  - `paperless-consume/` → shared with Paperless, which ingests it (polls every 5s)
  - `paperless-exports/` → controller downloads from Paperless here, then copies to `nas/`
  - `config/` → download manifest
  - `power-monitoring/{inbox,processed,metadata}/`
- `npm run local:down` wipes the Docker volumes but not `local-dev/mnt/`. Delete its contents for a fully clean slate.
- Trigger a Paperless export manually from http://localhost:8875/ui/paperless instead of waiting for the hourly cron.
