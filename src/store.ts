import { configureStore, type Store } from '@reduxjs/toolkit'
import wishlistReducer from "./store/wishlist.ts";
import settingsReducer, { DEFAULT_SETTINGS, type SyncSettings, clearRestartFlag } from "./store/settings.ts";

import { Doc, transact, Array as YArray, Map as YMap } from 'yjs';
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import * as awarenessProtocol from "y-protocols/awareness.js";
import { enhanceReducer, ROOT_MAP_NAME, SET_STATE_FROM_YJS_ACTION } from 'redux-yjs-bindings';

interface ImportMetaEnv {
  readonly VITE_SIGNALING_URL?: string;
}

declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const yDoc = new Doc();
const persistence = new IndexeddbPersistence("com.github.cdwishlist", yDoc);

const store = configureStore({
  reducer: {
    wishlist: enhanceReducer(wishlistReducer),
    settings: settingsReducer
  },
});

function getSignalingUrls(settings: SyncSettings): string[] {
  if (settings.signalingUrl) {
    return [settings.signalingUrl];
  }
  return [DEFAULT_SETTINGS.signalingUrl];
}

function getIceServers(settings: SyncSettings): { urls: string }[] {
  return settings.iceServers
    .split('\n')
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(url => ({ urls: url }));
}

function getIceConfig(settings: SyncSettings): RTCConfiguration {
  const iceServers = getIceServers(settings);
  return {
    iceTransportPolicy: 'all' as RTCIceTransportPolicy,
    iceServers,
  };
}

function createProvider(settings: SyncSettings): WebrtcProvider {
  const signalingUrls = getSignalingUrls(settings);
  const iceConfig = getIceConfig(settings);
  const iceServers = iceConfig.iceServers || [];
  const hasTurn = iceServers.some(s => s.urls.includes('turn'));
  console.log('[config]', JSON.stringify({ 
    signalingUrls, 
    iceTransportPolicy: iceConfig.iceTransportPolicy,
    iceServerCount: iceServers.length,
    hasTurn,
    localNetworkOnly: settings.localNetworkOnly 
  }));
  const provider = new WebrtcProvider(settings.roomName, yDoc, {
    password: settings.password || undefined,
    signaling: signalingUrls,
    awareness: new awarenessProtocol.Awareness(yDoc),
    filterBcConns: settings.filterBcConns,
    maxConns: settings.maxConns,
    peerOpts: {
      config: iceConfig,
    },
  });

  provider.on('synced', () => {
    console.log('[webrtc] synced');
  });

  return provider;
}

let provider = createProvider(store.getState().settings);
let lastPeerCount = 0;
let oscillationCount = 0;
let lastLogTime = Date.now();

provider.on('peers', ({ webrtcPeers }: { webrtcPeers: string[] }) => {
  const currentCount = webrtcPeers.length;
  if ((lastPeerCount === 0 && currentCount === 1) || (lastPeerCount === 1 && currentCount === 0)) {
    oscillationCount++;
  }
  lastPeerCount = currentCount;

  const now = Date.now();
  if (now - lastLogTime >= 5000) {
    console.log('[webrtc] osc count:', oscillationCount, 'current peers:', currentCount);
    oscillationCount = 0;
    lastLogTime = now;
  }
});

function restartProvider() {
  provider.destroy();
  provider = createProvider(store.getState().settings);
  store.dispatch(clearRestartFlag());
}

store.subscribe(() => {
  const state = store.getState().settings;
  if (state.needsProviderRestart) {
    restartProvider();
  }
});

function toSharedType(value: unknown): unknown {
  if (Array.isArray(value)) {
    const arr = new YArray();
    arr.push(value.map(toSharedType));
    return arr;
  }
  if (typeof value === 'object' && value !== null) {
    const map = new YMap();
    for (const [key, val] of Object.entries(value)) {
      map.set(key, toSharedType(val));
    }
    return map;
  }
  return value;
}

function bindRespectingExistingData(doc: Doc, store: Store, sliceName: string) {
  const rootMap = doc.getMap(ROOT_MAP_NAME);
  const state = store.getState();
  const initialState = state[sliceName as keyof typeof state];

  const hasYjsData = rootMap.has(sliceName);
  const hasReduxData = typeof initialState === 'object' && initialState !== null &&
    JSON.stringify(initialState) !== JSON.stringify({ids: []});

  const orphanedIds = rootMap.get('ids');
  if (!hasYjsData && orphanedIds && typeof (orphanedIds as { toJSON?: () => unknown }).toJSON === 'function') {
    transact(doc, () => {
      rootMap.set(sliceName, { ids: (orphanedIds as { toJSON: () => unknown }).toJSON() });
      rootMap.delete('ids');
    });
  } else if (!hasYjsData && hasReduxData) {
    transact(doc, () => {
      rootMap.set(sliceName, toSharedType(initialState));
    });
  }

  rootMap.forEach((_value, key) => {
    if (key !== sliceName && key !== ROOT_MAP_NAME) {
      transact(doc, () => {
        rootMap.delete(key);
      });
    }
  });

  let patchingYjs = false;
  let patchingStore = false;
  const s0 = store.getState();
  let currentState = s0[sliceName as keyof typeof s0];

  const reduxUnsubscribe = store.subscribe(() => {
    const prevState = currentState;
    const s = store.getState();
    currentState = s[sliceName as keyof typeof s];
    if (patchingStore) return;
    if (JSON.stringify(prevState) === JSON.stringify(currentState)) return;
    patchingYjs = true;
    transact(doc, () => {
      rootMap.set(sliceName, toSharedType(currentState));
    });
    patchingYjs = false;
  });

  const handleYjsChange = () => {
    if (patchingYjs) return;
    patchingStore = true;
    const yjsSlice = rootMap.get(sliceName);
    if (yjsSlice && typeof (yjsSlice as { toJSON?: () => unknown }).toJSON === 'function') {
      store.dispatch({ type: SET_STATE_FROM_YJS_ACTION, payload: (yjsSlice as { toJSON: () => unknown }).toJSON() });
    }
    patchingStore = false;
  };

  rootMap.observeDeep(handleYjsChange);
  handleYjsChange();

  return () => {
    reduxUnsubscribe();
    rootMap.unobserveDeep(handleYjsChange);
  };
}

let bound = false;

function bindOnce() {
  if (bound) return;
  bound = true;
  bindRespectingExistingData(yDoc, store, 'wishlist');
}

persistence.on('synced', bindOnce);

window.addEventListener('beforeunload', () => {
  provider.destroy();
});

export { provider, yDoc };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export default store;
