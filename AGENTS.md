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

## Troubleshooting

**MCP servers won't start**: Check Docker is running (`docker ps`), ports 3000/3001 are free.

**WebRTC sync broken**: Both browsers must use the same signaling URL. Check the Debug page for "Synced · N peers" status.