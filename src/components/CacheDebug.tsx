import { useState, useEffect, type FC } from "react";

interface CacheInfo {
  name: string;
  entries: number;
}

export const CacheDebug: FC = () => {
  const [cachesInfo, setCachesInfo] = useState<CacheInfo[]>([]);
  const [swStatus, setSwStatus] = useState<string>("checking...");

  useEffect(() => {
    const checkCaches = async () => {
      if (!("caches" in window)) {
        setSwStatus("Cache API not available");
        return;
      }

      try {
        const cacheNames = await window.caches.keys();
        const info: CacheInfo[] = [];

        for (const name of cacheNames) {
          const cache = await window.caches.open(name);
          const requests = await cache.keys();
          info.push({ name, entries: requests.length });
        }

        setCachesInfo(info);
      } catch (e) {
        console.error("Failed to read caches:", e);
      }
    };

    const checkServiceWorker = () => {
      if (!("serviceWorker" in navigator)) {
        setSwStatus("Service Worker not supported");
        return;
      }

      navigator.serviceWorker.ready.then((registration) => {
        setSwStatus(`Active: ${registration.active ? "Yes" : "No"}`);
      }).catch(() => {
        setSwStatus("Failed to check");
      });
    };

    checkCaches();
    checkServiceWorker();

    // Refresh every 5 seconds
    const interval = setInterval(checkCaches, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.8)",
        color: "#0f0",
        padding: "10px",
        borderRadius: "4px",
        fontSize: "12px",
        fontFamily: "monospace",
        maxWidth: "300px",
      }}
    >
      <div><strong>SW:</strong> {swStatus}</div>
      <div style={{ marginTop: "5px" }}>
        <strong>Caches:</strong>
        {cachesInfo.length === 0 ? (
          <div style={{ color: "#f66" }}>None found</div>
        ) : (
          cachesInfo.map((cache) => (
            <div key={cache.name}>
              {cache.name}: {cache.entries} entries
            </div>
          ))
        )}
      </div>
    </div>
  );
};
