import type { FC } from "react";
import { useEffect, useState } from "react";
import { provider } from "../store.ts";

export const SyncStatus: FC = () => {
  const [peerCount, setPeerCount] = useState(0);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const onPeers = ({ webrtcPeers }: { webrtcPeers: string[] }) => {
      setPeerCount(webrtcPeers.length);
    };

    const onSynced = ({ synced: s }: { synced: boolean }) => {
      setSynced(s);
    };

    provider.on("peers", onPeers);
    provider.on("synced", onSynced);

    return () => {
      provider.off("peers", onPeers);
      provider.off("synced", onSynced);
    };
  }, []);

  const state = peerCount === 0 ? "waiting" : synced ? "synced" : "syncing";

  const label = state === "synced"
    ? `Synced · ${peerCount} peer${peerCount !== 1 ? "s" : ""}`
    : state === "syncing"
      ? `Syncing · ${peerCount} peer${peerCount !== 1 ? "s" : ""}`
      : "Waiting for peers";

  return (
    <div className={`sync-status sync-status--${state}`}>
      <span className="sync-status__dot" />
      <span>{label}</span>
    </div>
  );
};
