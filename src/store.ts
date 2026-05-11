import { configureStore, type Store } from '@reduxjs/toolkit'
import wishlistReducer from "./store/wishlist.ts";
import settingsReducer from "./store/settings.ts";

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

const signalingUrls = import.meta.env.VITE_SIGNALING_URL
  ? [import.meta.env.VITE_SIGNALING_URL]
  : ["ws://localhost:4444"];

const yDoc = new Doc();

const persistence = new IndexeddbPersistence("com.github.cdwishlist", yDoc);

const store = configureStore({
  reducer: {
    wishlist: enhanceReducer(wishlistReducer),
    settings: enhanceReducer(settingsReducer)
  },
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
    console.log('[yjs→redux] handleYjsChange fired, sliceName:', sliceName, 'hasSlice:', !!yjsSlice);
    if (yjsSlice && typeof (yjsSlice as { toJSON?: () => unknown }).toJSON === 'function') {
      const payload = (yjsSlice as { toJSON: () => unknown }).toJSON();
      console.log('[yjs→redux] Dispatching SET_STATE_FROM_YJS_ACTION with:', JSON.stringify(payload));
      store.dispatch({ type: SET_STATE_FROM_YJS_ACTION, payload });
      const state = store.getState();
      const sliceState = state[sliceName as keyof typeof state];
      console.log('[yjs→redux] Store state after dispatch:', JSON.stringify(sliceState));
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

const provider = new WebrtcProvider("com.github.cdwishlist", yDoc, {
  password: undefined,
  signaling: signalingUrls,
  awareness: new awarenessProtocol.Awareness(yDoc),
  filterBcConns: false,
  maxConns: 25,
  peerOpts: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
    ],
  },
});

provider.on('peers', ({ webrtcPeers }: { webrtcPeers: string[] }) => {
  console.log('[webrtc] peers changed:', webrtcPeers.length, 'peers:', webrtcPeers);
});

provider.on('synced', () => {
  console.log('[webrtc] synced with remote peers');
});

yDoc.on('update', (update: Uint8Array, origin: unknown) => {
  const isRemote = origin !== persistence;
  console.log('[yjs] update received, size:', update.byteLength, 'remote:', isRemote, 'origin:', origin);
});

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
export default store;


// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
// Use throughout your app instead of plain `useDispatch` and `useSelector`
