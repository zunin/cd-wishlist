import type { FC } from "react";
import { useEffect, useState } from "react";
import { provider, yDoc } from "../store.ts";
import { ROOT_MAP_NAME } from "redux-yjs-bindings";

interface PeerInfo {
  clientId: number;
  user: Record<string, unknown>;
}

export const SyncDebug: FC = () => {
  const [reduxState, setReduxState] = useState<Record<string, unknown>>({});
  const [yjsState, setYjsState] = useState<Record<string, unknown>>({});
  const [peers, setPeers] = useState<string[]>([]);
  const [awarenessStates, setAwarenessStates] = useState<PeerInfo[]>([]);
  const [clientId, setClientId] = useState(0);
  const [updateCount, setUpdateCount] = useState(0);

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
    };

    const onYjsUpdate = () => {
      updates++;
      setUpdateCount(updates);
      setClientId(yDoc.clientID);
    };

    setClientId(yDoc.clientID);

    const rootMap = yDoc.getMap(ROOT_MAP_NAME);
    rootMap.observeDeep(updateRedux);
    rootMap.observeDeep(updateYjs);
    provider.on("peers", onPeers);
    provider.awareness.on("change", updateAwareness);
    yDoc.on("update", onYjsUpdate);

    updateRedux();
    updateYjs();
    updateAwareness();

    return () => {
      rootMap.unobserveDeep(updateRedux);
      rootMap.unobserveDeep(updateYjs);
      provider.off("peers", onPeers);
      provider.awareness.off("change", updateAwareness);
      yDoc.off("update", onYjsUpdate);
    };
  }, []);

  return (
    <details className="sync-debug">
      <summary>Debug: Sync State</summary>
      <div className="sync-debug__content">
        <section>
          <h3>Peers ({peers.length})</h3>
          <pre>{JSON.stringify(peers, null, 2)}</pre>
        </section>
        <section>
          <h3>Awareness ({awarenessStates.length} clients)</h3>
          <pre>{JSON.stringify(awarenessStates, null, 2)}</pre>
        </section>
        <section>
          <h3>Client ID</h3>
          <pre>{clientId}</pre>
        </section>
        <section>
          <h3>Update Count</h3>
          <pre>{updateCount}</pre>
        </section>
        <section>
          <h3>Redux Store (wishlist slice)</h3>
          <pre>{JSON.stringify(reduxState.wishlist, null, 2)}</pre>
        </section>
        <section>
          <h3>Yjs Document (wishlist root)</h3>
          <pre>{JSON.stringify(yjsState.wishlist, null, 2)}</pre>
        </section>
        <section>
          <h3>Match?</h3>
          <pre>
            {JSON.stringify(reduxState.wishlist) === JSON.stringify(yjsState.wishlist)
              ? "YES - Redux and Yjs are in sync"
              : "NO - Redux and Yjs are OUT OF SYNC"}
          </pre>
        </section>
      </div>
    </details>
  );
};
