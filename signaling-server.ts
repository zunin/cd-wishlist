/**
 * y-webrtc compatible signaling server for Deno.
 *
 * This implements the signaling protocol used by y-webrtc to allow peers
 * to discover each other and exchange WebRTC offers/answers/ICE candidates.
 *
 * Protocol messages:
 * - { type: "subscribe", topics: string[] }   - subscribe to rooms
 * - { type: "unsubscribe", topics: string[] } - unsubscribe from rooms
 * - { type: "publish", topic: string, ... }   - relay message to room peers
 * - { type: "ping" }                          - keepalive ping
 *
 * Reference: https://github.com/yjs/y-webrtc/blob/master/bin/server.js
 */

const PING_TIMEOUT = 30_000;

/** Map from topic name to set of subscribed WebSocket connections */
const topics = new Map<string, Set<WebSocket>>();

const send = (conn: WebSocket, message: Record<string, unknown>) => {
  if (conn.readyState === WebSocket.OPEN) {
    try {
      conn.send(JSON.stringify(message));
    } catch {
      conn.close();
    }
  }
};

const setupConnection = (socket: WebSocket) => {
  const subscribedTopics = new Set<string>();
  let pongReceived = true;

  const pingInterval = setInterval(() => {
    if (!pongReceived) {
      socket.close();
      clearInterval(pingInterval);
    } else {
      pongReceived = false;
      send(socket, { type: "ping" });
    }
  }, PING_TIMEOUT);

  socket.addEventListener("message", (event) => {
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(event.data as string);
    } catch {
      return;
    }

    if (!message || !message.type) return;

    switch (message.type) {
      case "subscribe":
        ((message.topics as string[]) || []).forEach((topicName: string) => {
          if (typeof topicName !== "string") return;
          if (!topics.has(topicName)) {
            topics.set(topicName, new Set());
          }
          topics.get(topicName)!.add(socket);
          subscribedTopics.add(topicName);
        });
        break;

      case "unsubscribe":
        ((message.topics as string[]) || []).forEach((topicName: string) => {
          const subs = topics.get(topicName);
          if (subs) {
            subs.delete(socket);
            if (subs.size === 0) topics.delete(topicName);
          }
        });
        break;

      case "publish":
        if (message.topic && typeof message.topic === "string") {
          const receivers = topics.get(message.topic);
          if (receivers) {
            const outMessage = { ...message, clients: receivers.size };
            receivers.forEach((receiver) => {
              send(receiver, outMessage);
            });
          }
        }
        break;

      case "ping":
        send(socket, { type: "pong" });
        break;

      case "pong":
        pongReceived = true;
        break;
    }
  });

  socket.addEventListener("close", () => {
    clearInterval(pingInterval);
    subscribedTopics.forEach((topicName) => {
      const subs = topics.get(topicName);
      if (subs) {
        subs.delete(socket);
        if (subs.size === 0) {
          topics.delete(topicName);
        }
      }
    });
    subscribedTopics.clear();
  });
};

const port = parseInt(Deno.env.get("PORT") || "4444");

Deno.serve({ port }, (req) => {
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("y-webrtc signaling server\n", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  setupConnection(socket);
  return response;
});
