# CD Wishlist Development

## Overview

This is a React SPA with Y.js WebRTC synchronization for collaborative wishlist management.

## Architecture

All significant architecture decisions are documented in `doc/arch/adr-*.md`. Before making structural changes, read the relevant ADRs to understand why decisions were made. Each ADR follows the Nygard format (Context, Decision, Consequences).

## Development Environment

### Prerequisites

- Docker must be installed and running
- Verify Docker is working: `docker ps`
- Docker network `cd-wishlist` is created automatically by `docker compose up`

### Services

| Service | Internal URL | External URL |
|---------|--------------|--------------|
| Frontend | http://frontend:5173 | http://localhost:5173 |
| Signaling Server | ws://signaling:4444 | ws://localhost:4444 |

Use internal URLs from within Docker containers, external URLs from host machine.

### Running Services

```bash
# Start all services (frontend, signaling, playwright MCP servers)
docker compose up -d

# Verify all services are running
docker compose ps

# Stop all services
docker compose down
```

### Development Without Docker

The frontend can run directly on the host:

```bash
deno task dev
```

This uses Vite dev server directly. Note: Without Docker, the signaling server and playwright MCP must still be run via Docker.

### Playwright MCP Servers

Two Playwright MCP server instances are configured for browser automation.

#### How MCP Discovery Works

OpenCode reads `opencode.json` and spawns MCP servers as local subprocesses using `start-mcp.sh`. Each script launches a `mcr.microsoft.com/playwright/mcp` Docker container.

#### Network Configuration

The MCP containers need to reach the signaling server at `ws://signaling:4444`. The script uses `--add-host=signaling:host-gateway` to resolve the `signaling` hostname from the host machine.

If the signaling server isn't available, browsers will still work but WebRTC sync won't connect peers.

## Available Tools

### Browser Control

The agent can use Playwright MCP tools to control browsers. Tool names follow the pattern `{mcp-name}_browser_{action}`.

Available MCP servers (configured in opencode.json):
- `playwright` - Primary browser on port 3000
- `playwright-browser2` - Secondary browser on port 3001

Example usage:
```
use playwright to navigate to http://localhost:5173
use playwright-browser2 to take a snapshot of the page
```

Tools are auto-discovered - the agent will show available browser tools when needed.

## Troubleshooting

### MCP servers won't start

1. Ensure Docker is running: `docker ps`
2. Check that ports 3000/3001 are not in use: `docker compose ps`
3. View container logs: `docker compose logs playwright`

### Browsers can't reach signaling server

- From inside Docker: `ws://signaling:4444` (use `signaling` hostname)
- From host: `ws://localhost:4444` (use `localhost`)
- Update browser settings in the app to match your network

### WebRTC sync not working between browsers

1. Both browsers must use the same signaling server URL
2. Check Settings page in the app to verify signaling URL
3. Ensure "Local Network Only" is disabled if testing across different networks
4. Check the Debug page ("Synced · N peers" indicator shows connection status)