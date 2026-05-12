# ADR-0006: IndexedDB Persistence via y-indexeddb

## Status

Accepted

## Context

The application needs to persist user data locally so that:
- Data survives page reloads and browser restarts
- Users can continue offline and sync when reconnected
- No server-side storage is required for basic functionality

Browser storage options:
- **localStorage** - Simple key-value, 5-10MB limit, synchronous API
- **IndexedDB** - Large storage, async API, queryable
- **Cache API** - Request/response storage, good for assets
- **y-indexeddb** - Y.js's own persistence adapter for IndexedDB

Y.js has built-in support for persistence via providers.

## Decision

We will use **y-indexeddb** for local persistence of the Y.js document.

```typescript
import { IndexeddbPersistence } from 'y-indexeddb';

const persistence = new IndexeddbPersistence('cd-wishlist', yDoc);
```

The persistence adapter:
- Stores the Y.js document binary in IndexedDB
- Automatically loads document on page load before rendering
- Writes document changes to IndexedDB in real-time
- Handles browser storage quotas and errors gracefully

## Consequences

**Positive:**
- Document persists across page reloads and browser restarts
- Works fully offline - changes sync when connection restored
- IndexedDB has generous storage limits (typically 50MB+)
- Y.js handles all serialization/deserialization
- No server-side storage needed for personal use

**Negative:**
- IndexedDB is async, adds complexity to initial load timing
- Storage quota limits vary by browser and user's device
- Clearing browser data erases local wishlist
- First load after clearing may need full sync from peers

**Neutral:**
- Storage key is `'cd-wishlist'` - may conflict with other apps using same key
- Persistence is per-origin (same domain shares storage)
- Y.js compaction/gc must run periodically to prevent unbounded growth