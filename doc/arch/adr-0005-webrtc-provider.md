# ADR-0005: WebRTC Provider for Peer-to-Peer Sync

## Status

Accepted

## Context

Y.js requires a "provider" to transmit document updates between peers. The provider handles the transport layer while Y.js handles the data synchronization.

Available options:

- **y-webrtc** - Uses WebRTC data channels for peer-to-peer communication. Good for direct browser-to-browser sync.
- **y-websocket** - Uses WebSocket connections to a central server. Simpler but server becomes bottleneck.
- **y-indexeddb** - Only handles local persistence, no network sync.
- **y-cloud** - Paid service with hosted infrastructure.

The application requires:
- Direct browser-to-browser communication when possible
- Fallback when direct connection not possible (NAT traversal)
- Integration with the y-webrtc signaling server

## Decision

We will use **y-webrtc** as the Y.js provider.

```typescript
const provider = new WebrtcProvider(roomName, yDoc, {
  password: settings.password || undefined,
  signaling: signalingUrls,
  awareness: new awarenessProtocol.Awareness(yDoc),
  filterBcConns: settings.filterBcConns,
  maxConns: settings.maxConns,
  peerOpts: { config: iceConfig },
});
```

The provider:
1. Connects to signaling server to announce presence in a room
2. Discovers other peers in the same room
3. Establishes WebRTC connections (data channels) directly between peers
4. Syncs Y.js document updates via these data channels
5. Uses ICE servers (STUN/TURN) for NAT traversal

## Consequences

**Positive:**
- Peer-to-peer architecture - no central server for data
- Direct connections reduce latency for local peers
- Y.js sync protocol handles all the complexity
- Awareness protocol tracks online peers, cursor positions, etc.
- Works across network boundaries via ICE/TURN

**Negative:**
- WebRTC connection establishment adds latency on initial connect
- TURN servers (for NAT traversal) add relay latency and cost
- Browser WebRTC implementations vary - debugging is difficult
- Connection can fail in restrictive network environments

**Neutral:**
- Signaling server still needed for peer discovery
- ICE configuration must be provided (Google STUN servers used by default)
- `filterBcConns` option optimizes same-browser-tab communication via BroadcastChannel