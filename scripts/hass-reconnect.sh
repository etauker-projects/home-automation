#!/usr/bin/env

echo "[hass-reconnect][step 1]: stopping home-assistant..." && \
docker compose down home-assistant && \
echo "[hass-reconnect][step 2]: starting home-assistant-host-mode and waiting 10s..." && \
((docker compose up home-assistant-host-mode & sleep 10s) > /dev/null 2>&1) && \
echo "[hass-reconnect][step 3]: stopping home-assistant-host-mode..." && \
docker compose down home-assistant-host-mode && \
echo "[hass-reconnect][step 4]: starting home-assistant..." && \
docker compose up -d home-assistant && \
echo "[hass-reconnect][step 5]: ...done"
