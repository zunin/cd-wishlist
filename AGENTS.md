# CD Wishlist

React SPA with Y.js WebRTC sync for collaborative wishlist management.

## Key Facts

- **Runtime**: Deno (not Node.js). All scripts use `deno run` or `deno task`.
- **Package imports**: Uses `npm:` prefix for npm packages (e.g., `npm:vite`, `npm:react`).
- **State**: Redux + redux-yjs-bindings. Redux manages UI state, Y.js handles sync. Provider restarts when sync settings change.
- **Signaling**: Custom WebSocket server (`signaling-server.ts`). Room data is ephemeral.

## Developer Commands

All commands run inside Docker containers — no local dependencies needed.

```bash
docker compose run --rm frontend deno task dev          # Start Vite dev server (http://localhost:5173)
docker compose run --rm frontend deno task typecheck     # Type-check only
docker compose run --rm frontend deno task lint          # Run ESLint
docker compose run --rm frontend deno task build         # Typecheck + production build
docker compose run --rm frontend deno task signal        # Run signaling server (ws://localhost:4444)
```

Note: `build` runs typecheck first; if typecheck fails, the build does not run.

## Architecture Docs

All ADRs are in `doc/arch/adr-*.md` (Nygard format). Read them before structural changes.

## Docker Services

| Service | Internal URL | External URL |
|---------|--------------|--------------|
| Frontend | http://frontend:5173 | http://localhost:5173 |
| Signaling | ws://signaling:4444 | ws://localhost:4444 |
| Playwright MCP | - | http://localhost:3000/mcp, http://localhost:3001/mcp |

## Build

```bash
docker compose build        # Build all images
docker compose up -d        # Start all services (frontend, signaling, playwright x2)
docker compose ps           # Verify all containers are running
```

## Playwright MCP (for testing WebRTC sync)

`docker compose up -d` exposes two MCP servers on ports 3000 and 3001. Both are needed to verify WebRTC sync — each browser represents a separate peer. Tool names follow `{mcp-name}_browser_{action}` pattern (e.g., `playwright_browser_navigate`, `playwright-browser2_browser_navigate`).

### MCP Server Configuration

The containers require `--allowed-hosts '*'` flag to accept requests from external hosts (not just localhost). This is configured in docker-compose.yml:

```yaml
command: ["/app/cli.js", "--headless", "--browser", "chromium", "--no-sandbox", 
          "--port", "8931", "--host", "0.0.0.0", "--allowed-hosts", "*"]
```

Without `--allowed-hosts '*'`, the server rejects requests with "Access is only allowed at localhost:8931".

### MCP Protocol (SSE Transport)

The Playwright MCP server uses Server-Sent Events (SSE) transport. To interact with it:

1. **Establish SSE session** (returns sessionId):
   ```bash
   curl -N http://localhost:3000/sse
   # Response: event: endpoint\ndata: /sse?sessionId=<uuid>
   ```

2. **Send commands** via POST to session endpoint:
   ```bash
   curl -X POST "http://localhost:3000/sse?sessionId=<uuid>" \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "method": "tools/call",
       "params": {
         "name": "browser_navigate",
         "arguments": {"url": "http://frontend:5173"}
       },
       "id": 1
     }'
   ```

3. **Receive responses** via SSE stream (same connection from step 1).

**Note**: Keep the SSE connection alive while sending commands. Each browser needs its own SSE session.

### Testing WebRTC Sync

**Key concept**: Each browser generates a random memorable room name (e.g., "ZephyrMarten", "SwiftBear") for privacy isolation. To test sync:

1. **Different rooms** (default): Browsers have different room names → Peers=0, Awareness=1 (no sync)
2. **Same room**: Set both browsers to identical room name → Peers=1, Awareness=2 (synced)

**Example sync test**:
```bash
# Browser 1: Check its room name in Settings
# Browser 2: Navigate to Settings, set same room name as Browser 1
# Both: Navigate to Debug page
# Verify: Peers=1, Awareness=2 on both browsers
```

**Important**: Browsers have "Local Network Only" checked by default. For cross-container sync, either:
- Uncheck "Local Network Only" in Settings, OR
- Ensure both browsers are on the same Docker network (they are, via `cd-wishlist` network)

### Common MCP Commands

```bash
# Navigate
{"name": "browser_navigate", "arguments": {"url": "http://frontend:5173"}}

# Click element (use ref from snapshot)
{"name": "browser_click", "arguments": {"target": "e5"}}

# Take snapshot (returns page structure)
{"name": "browser_snapshot", "arguments": {}}

# Fill form
{"name": "browser_fill_form", "arguments": {"fields": [...]}}
```

## Troubleshooting

**MCP servers won't start**: Check Docker is running (`docker ps`), ports 3000/3001 are free.

**WebRTC sync broken**: Both browsers must use the same signaling URL. Check the Debug page for "Synced · N peers" status.

**"Access is only allowed at localhost:8931"**: The MCP server is rejecting external connections. Ensure `--allowed-hosts '*'` is set in docker-compose.yml and containers are recreated: `docker compose up -d --force-recreate playwright playwright-browser2`

**"Session not found" error**: The SSE session expired or wasn't established. Each command sequence must: (1) Open SSE connection, (2) Extract sessionId, (3) Send POST commands with that sessionId, (4) Read responses from SSE stream.

**Browsers not syncing**: Check Debug page on both browsers:
- If Peers=0 on both: They're in different rooms (default behavior for privacy)
- To sync: Set both browsers to the same room name in Settings
- If "Local Network Only" is checked, browsers must be on same Docker network
- Wait 5-10 seconds for WebRTC handshake after changing room names