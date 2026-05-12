# ADR-0004: Custom WebSocket Signaling Server

## Status

Accepted

## Context

Y.js uses WebRTC for peer-to-peer communication, but WebRTC requires an out-of-band mechanism for peers to discover each other and exchange connection metadata (SDP offers, answers, ICE candidates). This "signaling" process requires a central server that:

- Maintains room membership (which peers are in which room)
- Relays signaling messages between peers
- Is lightweight (doesn't store data, just routes messages)

Options considered:

- **y-webrtc provider with public signaling servers** - Uses servers like `wss://signaling.yjs.dev`. Convenient but relies on third-party infrastructure, limited customization.
- **Custom signaling server** - Build our own using Deno's WebSocket support. Full control but requires maintenance.
- **Third-party hosted y-webrtc signaling** - Paid options like Liveblocks or PartyKit. Extra dependency but managed infrastructure.

## Decision

We will implement a **custom WebSocket signaling server** (`signaling-server.ts`).

The server implements the y-webrtc signaling protocol:
- `subscribe` - Client joins a room/topic
- `unsubscribe` - Client leaves a room
- `publish` - Client sends message to all peers in room
- `ping/pong` - Keepalive mechanism (30-second timeout)

```typescript
// Message types the server handles
{ type: "subscribe", topics: string[] }
{ type: "unsubscribe", topics: string[] }
{ type: "publish", topic: string, ...payload }
{ type: "ping" }
```

## Consequences

**Positive:**
- No dependency on third-party signaling infrastructure
- Full control over server configuration and scaling
- Lightweight implementation (~127 lines)
- Room data never persisted - fully ephemeral
- Can deploy to any WebSocket-capable hosting (Deno Deploy)

**Negative:**
- Must maintain the signaling server code
- No built-in monitoring, metrics, or alerting
- If server goes down, peers cannot discover each other (existing connections continue)
- Horizontal scaling requires sticky sessions or pub/sub fronting

**Neutral:**
- Server only handles message routing, not data storage
- Each room is just a Set of WebSocket connections
- Message delivery is best-effort (no persistence if peer not connected)