# ADR-0001: Deno as JavaScript Runtime

## Status

Accepted

## Context

The project requires a JavaScript runtime for both development (Vite dev server, build tooling) and production (frontend SPA, signaling server). The team considered three primary options:

- **Node.js** - The dominant runtime, extensive ecosystem compatibility, but requires separate package manager (npm/yarn/pnpm)
- **Bun** - Newer runtime with fast startup and built-in package manager, but ecosystem compatibility still maturing
- **Deno** - Modern runtime with TypeScript-first approach, built-in package management via URLs, designed for security

The project needed a runtime that:
1. Supports TypeScript without separate compilation step during development
2. Works with existing npm packages (Vite, React, Y.js ecosystem)
3. Can run on Deno Deploy for potential edge deployment
4. Provides consistent tooling experience across team

## Decision

We will use **Deno** as the JavaScript runtime for all project tooling and server components.

- Development: `deno task dev` starts Vite dev server via `deno run -A npm:vite`
- Signaling server: `deno run --allow-net signaling-server.ts`
- Build: `deno task build` runs Vite production build
- Deployment: Can target Deno Deploy

For npm packages, the project uses `npm:` prefix to import from npm CDN (e.g., `npm:vite`, `npm:react`).

## Consequences

**Positive:**
- TypeScript is natively supported without configuration or separate compilation
- Single toolchain for both frontend and backend (signaling server)
- URL-based imports eliminate dependency on separate package manager lock files
- Deno Deploy provides straightforward path to edge deployment
- Security-conscious design (permissions-based access control)

**Negative:**
- Some npm packages require additional configuration when used with Deno
- `npm:` prefix required for all npm dependencies
- Ecosystem documentation and Stack Overflow answers typically assume Node.js
- IDE support (especially debugging) less mature than Node.js

**Neutral:**
- Team must be familiar with Deno's module resolution and permission system
- CI/CD pipelines need Deno installation rather than Node.js
- Cache directory (.cache/deno) stores downloaded modules separately from npm