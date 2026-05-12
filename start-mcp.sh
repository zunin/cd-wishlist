#!/bin/bash
# Start the Playwright MCP server
# Usage: start-mcp.sh [port]
# Defaults to port 3000 if not specified

PORT="${1:-3000}"

docker run -i --rm --init --pull=always \
    -p "${PORT}:${PORT}" \
    --add-host=host.docker.internal:host-gateway \
    --add-host=signaling:host-gateway \
    mcr.microsoft.com/playwright/mcp \
    /app/cli.js \
    --headless \
    --browser chromium \
    --no-sandbox \
    --port "${PORT}" \
    --host 0.0.0.0