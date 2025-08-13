declare let self: ServiceWorkerGlobalScope;
// activate new app version
self.addEventListener("message", (event) => {
  console.log({ worker_message_event: event });
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("install", (event) => {
  console.log("Service Worker: Install event triggered", event);
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activate event triggered", event);
  self.clients.claim();
});