# ADR-0002: Y.js CRDT for Real-time Synchronization

## Status

Accepted

## Context

The application requires real-time synchronization of wishlist data between multiple browser instances. Users should be able to add, remove, and modify items from multiple devices or browser tabs simultaneously, with all changes reflecting immediately across all peers.

Traditional approaches considered:

- **WebSocket with central server** - All changes routed through server, server maintains authoritative state. Simpler but creates single point of failure and scaling bottleneck.
- **Operational Transformation (OT)** - Server-based conflict resolution. Complex to implement correctly, especially for offline scenarios.
- **Conflict-free Replicated Data Types (CRDTs)** - Mathematical constructs that automatically resolve conflicts without central coordination. Can work peer-to-peer.

The application needs to support:
- Multiple concurrent editors
- Offline editing with later sync
- No central server dependency for data (signaling only)
- Automatic conflict resolution without user intervention

## Decision

We will use **Y.js** as the CRDT implementation for real-time synchronization.

Y.js provides:
- `Y.Doc` - Container for shared data types
- `Y.Map`, `Y.Array`, `Y.Text` - Specific data structures that auto-merge
- Battle-tested implementation used in production (used by Obsidian, Liveblocks, others)
- Well-documented data model

The Y.js document structure:
```
root (Y.Map)
├── wishlist: Y.Array<{ id: string }>
└── settings: Y.Map (key-value sync settings)
```

## Consequences

**Positive:**
- Automatic conflict resolution - no "last write wins" or lost updates
- Works peer-to-peer via WebRTC - no central data server needed
- Offline-capable - changes merge when reconnected
- Mature library with active maintenance and broad adoption
- Rich ecosystem (y-indexeddb, y-webrtc, etc.)

**Negative:**
- CRDT overhead - Y.js adds ~20KB gzipped to bundle
- Learning curve - developers must understand Y.js data model
- Memory usage - CRDT state grows over time, requires periodic compaction
- Complex operations (bulk updates, transactions spanning multiple keys) require careful handling

**Neutral:**
- Signaling server still required for peer discovery, but not for data storage
- Data persists locally in IndexedDB, not on the signaling server
- Each peer maintains full copy of the document