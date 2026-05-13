# CD Wishlist

React SPA with Y.js WebRTC sync for collaborative wishlist management.

## Key Facts

- **Runtime**: Deno (not Node.js). All scripts use `deno run` or `deno task`.
- **Package imports**: Uses `npm:` prefix for npm packages (e.g., `npm:vite`, `npm:react`).
- **State**: Redux + redux-yjs-bindings. Redux manages UI state, Y.js handles sync. Provider restarts when sync settings change.
- **Signaling**: Custom WebSocket server (`signaling-server.ts`). Room data is ephemeral.

## Developer Commands

```bash
deno task dev          # Start Vite dev server (http://localhost:5173)
deno task typecheck    # Type-check only (deno check src/main.tsx)
deno task lint         # Run ESLint (deno run -A npm:eslint .)
deno task build        # Typecheck + production build (typecheck && vite build)
deno task signal       # Run signaling server (ws://localhost:4444)
```

Note: `build` runs typecheck first, then build. If typecheck fails, the build does not run.

## Architecture Docs

All ADRs are in `doc/arch/adr-*.md` (Nygard format). Read them before structural changes.

## Docker Services

| Service | Internal URL | External URL |
|---------|--------------|--------------|
| Frontend | http://frontend:5173 | http://localhost:5173 |
| Signaling | ws://signaling:4444 | ws://localhost:4444 |
| Playwright MCP | - | ws://localhost:3000, 3001 |

```bash
docker compose up -d   # Start all services
docker compose down    # Stop all services
docker compose ps       # Verify running
```

## Playwright MCP (for testing WebRTC sync)

`docker compose up -d` exposes two MCP servers on ports 3000 and 3001. Both are needed to verify WebRTC sync — each browser represents a separate peer. Tool names follow `{mcp-name}_browser_{action}` pattern (e.g., `playwright_browser_navigate`, `playwright-browser2_browser_navigate`).

## Troubleshooting

**MCP servers won't start**: Check Docker is running (`docker ps`), ports 3000/3001 are free.

**WebRTC sync broken**: Both browsers must use the same signaling URL. Check the Debug page for "Synced · N peers" status.