import type { FC } from "react";
import { useEffect, useState, useCallback } from "react";
import { provider, yDoc } from "../store.ts";
import { ROOT_MAP_NAME } from "redux-yjs-bindings";
import { useAppSelector } from "../reduxhooks.ts";
import { CacheDebug } from "./CacheDebug.tsx";

interface PeerInfo {
  clientId: number;
  user: Record<string, unknown>;
}

interface DiagnosticPayload {
  timestamp: string;
  clientId: number;
  peers: string[];
  awarenessCount: number;
  awarenessClients: PeerInfo[];
  updateCount: number;
  reduxVsYjsInSync: boolean;
  wishlistData: unknown;
  settings: {
    roomName: string;
    signalingUrl: string;
    localNetworkOnly: boolean;
    filterBcConns: boolean;
  };
  signalingConnected: boolean;
  connectionLog: string[];
}

export const SyncDebug: FC = () => {
  const settings = useAppSelector((state) => state.settings);
  const [reduxState, setReduxState] = useState<Record<string, unknown>>({});
  const [yjsState, setYjsState] = useState<Record<string, unknown>>({});
  const [peers, setPeers] = useState<string[]>([]);
  const [awarenessStates, setAwarenessStates] = useState<PeerInfo[]>([]);
  const [clientId, setClientId] = useState(0);
  const [updateCount, setUpdateCount] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [signalingConnected, setSignalingConnected] = useState(false);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setConnectionLog(prev => [...prev.slice(-9), `${new Date().toISOString().split('T')[1].split('.')[0]} ${msg}`]);
  }, []);

  useEffect(() => {
    let updates = 0;

    const updateRedux = () => {
      const state = yDoc.getMap(ROOT_MAP_NAME).toJSON();
      setReduxState(state);
    };

    const updateYjs = () => {
      const rootMap = yDoc.getMap(ROOT_MAP_NAME);
      const data: Record<string, unknown> = {};
      rootMap.forEach((value, key) => {
        data[key] = (value as { toJSON?: () => unknown }).toJSON?.() ?? value;
      });
      setYjsState(data);
    };

    const updateAwareness = () => {
      const states = Array.from(provider.awareness.getStates().entries()).map(
        ([clientId, user]) => ({
          clientId,
          user: user as Record<string, unknown>,
        }),
      );
      setAwarenessStates(states);
    };

    const onPeers = ({ webrtcPeers }: { webrtcPeers: string[] }) => {
      setPeers(webrtcPeers);
      addLog(`peers changed: ${webrtcPeers.length}`);
    };

    const onYjsUpdate = () => {
      updates++;
      setUpdateCount(updates);
      setClientId(yDoc.clientID);
    };

    const onStatus = ({ connected }: { connected: boolean }) => {
      setSignalingConnected(connected);
      addLog(`signaling ${connected ? 'connected' : 'disconnected'}`);
    };

    const onSync = () => {
      addLog('synced with peers');
    };

    setClientId(yDoc.clientID);
    addLog(`client initialized: ${yDoc.clientID}`);
    addLog(`provider connected: ${provider.connected}`);

    const rootMap = yDoc.getMap(ROOT_MAP_NAME);
    rootMap.observeDeep(updateRedux);
    rootMap.observeDeep(updateYjs);
    provider.on("peers", onPeers);
    provider.on("status", onStatus);
    provider.on("synced", onSync);
    provider.awareness.on("change", updateAwareness);
    yDoc.on("update", onYjsUpdate);

    updateRedux();
    updateYjs();
    updateAwareness();

    if (provider.connected) {
      setSignalingConnected(true);
      addLog('signaling connected (initial)');
    }

    return () => {
      rootMap.unobserveDeep(updateRedux);
      rootMap.unobserveDeep(updateYjs);
      provider.off("peers", onPeers);
      provider.off("status", onStatus);
      provider.off("synced", onSync);
      provider.awareness.off("change", updateAwareness);
      yDoc.off("update", onYjsUpdate);
    };
  }, [addLog]);

  const copyToClipboard = useCallback(async () => {
    const payload: DiagnosticPayload = {
      timestamp: new Date().toISOString(),
      clientId,
      peers,
      awarenessCount: awarenessStates.length,
      awarenessClients: awarenessStates,
      updateCount,
      reduxVsYjsInSync: JSON.stringify(reduxState.wishlist) === JSON.stringify(yjsState.wishlist),
      wishlistData: reduxState.wishlist ?? yjsState.wishlist,
      settings: {
        roomName: settings.roomName,
        signalingUrl: settings.signalingUrl,
        localNetworkOnly: settings.localNetworkOnly,
        filterBcConns: settings.filterBcConns,
      },
      signalingConnected,
      connectionLog,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyStatus("success");
      setTimeout(() => setCopyStatus("idle"), 2000);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 2000);
    }
  }, [clientId, peers, awarenessStates, updateCount, reduxState, yjsState, settings, signalingConnected, connectionLog]);

  return (
    <div className="sync-debug">
      <div className="sync-debug__header">
        <h2>Sync Debug</h2>
        <button
          type="button"
          className={`sync-debug__copy ${copyStatus}`}
          onClick={copyToClipboard}
        >
          {copyStatus === "success" ? "Copied!" : copyStatus === "error" ? "Failed" : "Copy Diagnostics"}
        </button>
      </div>
      <div className="sync-debug__content">
        <section className="sync-debug__section">
          <div className="sync-debug__row">
            <div className="sync-debug__item">
              <h3>Peers</h3>
              <span className="sync-debug__value">{peers.length}</span>
            </div>
            <div className="sync-debug__item">
              <h3>Awareness</h3>
              <span className="sync-debug__value">{awarenessStates.length}</span>
            </div>
            <div className="sync-debug__item">
              <h3>Client ID</h3>
              <span className="sync-debug__value">{clientId}</span>
            </div>
            <div className="sync-debug__item">
              <h3>Updates</h3>
              <span className="sync-debug__value">{updateCount}</span>
            </div>
            <div className="sync-debug__item">
              <h3>Signaling</h3>
              <span className={`sync-debug__value ${signalingConnected ? 'sync-debug__value--green' : 'sync-debug__value--red'}`}>
                {signalingConnected ? 'ON' : 'OFF'}
              </span>
            </div>
          </div>
        </section>
        <section className="sync-debug__section">
          <h3>Connection Log</h3>
          <pre className="sync-debug__log">{connectionLog.join('\n')}</pre>
        </section>
        <section className="sync-debug__section">
          <h3>Redux vs Yjs</h3>
          <pre className="sync-debug__match">
            {JSON.stringify(reduxState.wishlist) === JSON.stringify(yjsState.wishlist)
              ? "IN SYNC"
              : "OUT OF SYNC"}
          </pre>
        </section>
        <section className="sync-debug__section">
          <h3>Wishlist Data</h3>
          <pre>{JSON.stringify(reduxState.wishlist ?? yjsState.wishlist, null, 2)}</pre>
        </section>
        <section className="sync-debug__section">
          <h3>Cache Info</h3>
          <CacheDebug />
        </section>
      </div>
    </div>
  );
};
