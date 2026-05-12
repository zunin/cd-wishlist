# ADR-0008: BroadcastChannel for Same-Browser Tab Sync

## Status

Accepted

## Context

Users may open the application in multiple tabs within the same browser. In this case, WebRTC connections between tabs are unnecessarily complex and wasteful:
- Same browser tabs can communicate via the BroadcastChannel API directly
- WebRTC connection establishment adds ~500ms latency
- Direct memory-to-memory transfer is faster than serialization → WebRTC → deserialization

Y.js's `y-webrtc` provider has built-in support for this optimization via the `filterBcConns` option.

## Decision

We will enable **BroadcastChannel** synchronization via the `filterBcConns` setting (enabled by default).

```typescript
const provider = new WebrtcProvider(roomName, yDoc, {
  // ... other options
  filterBcConns: true, // Default is true
});
```

When `filterBcConns: true`:
- Tabs in the same browser use BroadcastChannel instead of WebRTC
- Same-origin tabs share data instantly via browser's internal message bus
- Awareness state (online peers, cursor positions) also uses BroadcastChannel
- WebRTC is still used for communication with other browsers/devices

## Consequences

**Positive:**
- Near-instant sync between tabs in same browser
- No WebRTC overhead for common multi-tab use case
- Reduces peer count for actual WebRTC connections
- Works without any network involvement for local tabs

**Negative:**
- Only works for same-origin tabs (same domain, same protocol, same port)
- Chrome/Edge, Firefox, Safari have varying BroadcastChannel support (all modern browsers do)
- Debugging multi-tab sync issues requires understanding both BroadcastChannel and WebRTC paths

**Neutral:**
- y-webrtc handles the switch automatically
- User doesn't notice any difference
- Peers from other browsers still connect via WebRTC
- Awareness count shows all peers (BroadcastChannel + WebRTC combined)