# ADR-0007: PWA with Workbox Background Sync

## Status

Accepted

## Context

The application needs to function reliably even with intermittent network connectivity. Users should be able to:

- Continue browsing and managing wishlists offline
- Have changes persist locally when offline
- Sync seamlessly when connectivity returns

Progressive Web App (PWA) technologies provide these capabilities:
- **Service Worker** - Intercepts network requests, enables caching
- **Workbox** - Google's library for service worker management
- **Background Sync API** - Queue operations while offline, replay when online

The application makes two types of requests:
1. **Static assets** (JavaScript, CSS, images) - should be cached aggressively
2. **MusicBrainz API** - External API for album search, should use stale-while-revalidate
3. **CD data sources** (GitHub JSON files) - Updated periodically, should cache with background refresh

## Decision

We will implement PWA support using **Vite PWA Plugin** (`vite-plugin-pwa`) which internally uses **Workbox**.

Configuration strategy:
- Static assets: Cache-first with network fallback
- MusicBrainz API: Stale-while-revalidate for fast perceived performance
- CD data sources: Network-first with cache fallback, background sync for updates
- App shell: Precached for instant load

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/musicbrainz\.org/,
            handler: 'StaleWhileRevalidate',
          },
          {
            urlPattern: /^https:\/\/raw\.githubusercontent\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'cd-data-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
})
```

## Consequences

**Positive:**
- App loads instantly on repeat visits (cached shell + Y.js from IndexedDB)
- Works fully offline after first visit
- Background sync queues operations when offline
- Push notifications possible (future enhancement)
- Installable on desktop and mobile

**Negative:**
- Service worker complexity - debugging is difficult
- Cache invalidation requires careful handling
- First-time visitor still needs network
- PWA manifest must be configured correctly

**Neutral:**
- Chrome DevTools provides service worker debugging tools
- Workbox generates service worker automatically
- Cache storage limited by browser quota