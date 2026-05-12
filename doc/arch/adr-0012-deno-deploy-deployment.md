# ADR-0012: Deno Deploy Deployment Target

## Status

Accepted

## Context

The application consists of multiple components that need to be deployed:
1. **Frontend SPA** - Static files (HTML, CSS, JS)
2. **Signaling server** - WebSocket server for peer discovery
3. **API server** - (exists but unused) REST API

The team wanted a deployment platform that:
- Works naturally with Deno runtime
- Provides global edge distribution for low latency
- Has simple deployment workflow
- Supports WebSocket endpoints

Options considered:
- **Traditional VPS** - Full control but requires DevOps management
- **Vercel/Netlify** - Great for frontend, but Deno support is secondary
- **Deno Deploy** - Deno's own edge hosting, first-class Deno support

## Decision

We will target **Deno Deploy** as the primary deployment platform.

Deno Deploy provides:
- Edge runtime for Deno (runs TypeScript natively)
- WebSocket support for signaling server
- Global CDN for static assets
- Simple deployment via `deployctl` CLI or GitHub Actions

```typescript
// deploy.ts - Deno Deploy entry point
import { serve } from 'https://deno.land/std/http/server.ts';
import { signalingServer } from './signaling-server.ts';
import api from './api/routes.ts';

serve((req) => {
  const url = new URL(req.url);
  if (url.pathname.startsWith('/ws')) {
    return signalingServer(req);
  }
  return api.fetch(req);
});
```

## Consequences

**Positive:**
- Zero-configuration TypeScript deployment
- Global edge network for signaling server (low latency WebRTC setup)
- Consistent runtime - same code runs locally and deployed
- Free tier available for small projects
- Built-in KV store available for future data persistence

**Negative:**
- Platform lock-in - harder to migrate to other platforms
- Deno Deploy specific APIs differ from standard Deno
- Cold start latency on edge functions
- WebSocket connections may be affected by edge routing

**Neutral:**
- Can run locally with `deno run` during development
- Docker deployment still possible for self-hosting
- Other components (Vite SPA) still need separate deployment
- Monitoring/debugging tools are platform-specific