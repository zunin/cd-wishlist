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
  if (settings.localNetworkOnly) {
    return {
      iceTransportPolicy: 'local' as RTCIceTransportPolicy,
      iceServers: [],
    };
  }
  return {
    iceTransportPolicy: 'all' as RTCIceTransportPolicy,
    iceServers,
  };
}

function createProvider(settings: SyncSettings): WebrtcProvider {
  const signalingUrls = getSignalingUrls(settings);
  const iceConfig = getIceConfig(settings);

  console.log('[webrtc] Creating provider with config:', {
    signalingUrls,
    iceConfig,
    maxConns: settings.maxConns,
    filterBcConns: settings.filterBcConns,
  });

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

  provider.on('status', ({ connected }: { connected: boolean }) => {
    console.log('[webrtc] status changed:', connected);
  });

  provider.on('peers', ({ webrtcPeers, added, removed }: { webrtcPeers: string[], added?: string[], removed?: string[] }) => {
    console.log('[webrtc] peers changed:', webrtcPeers.length, 'peers:', webrtcPeers, 'added:', added, 'removed:', removed);
  });

  provider.on('synced', () => {
    console.log('[webrtc] synced with remote peers');
  });

  return provider;
}

let provider = createProvider(store.getState().settings);

yDoc.on('update', (update: Uint8Array, origin: unknown) => {
  const isRemote = origin !== persistence;
  console.log('[yjs] update received, size:', update.byteLength, 'remote:', isRemote, 'origin:', origin);
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
