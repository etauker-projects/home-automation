# Instructions for Adding a New Service

1. Add config to correct docker compose and env files
2. [DB] create a new user and DB: 
    - `docker exec -it <DB container> psql -U <DB admin> -d <DB name> --password`
    - `CREATE USER <service user> WITH PASSWORD '<service user password>';`
    - `CREATE DATABASE <service DB> OWNER <service user>;`
    - Note: password can be generated with `openssl rand -base64 48`
3. Start service
4. Add service to caddy
5. Add service to homepage
6. [TODO] Set up backup for mounted directories
7. Add service to uptime kuma
8. [OIDC] Integrate with Authentik
8. [HASS] Integrate with Home Assistant
