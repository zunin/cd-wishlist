import { configureStore } from '@reduxjs/toolkit'
import wishlistReducer from "./store/wishlist.ts";
import settingsReducer from "./store/settings.ts";

import { Doc } from 'yjs';
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import * as awarenessProtocol from "y-protocols/awareness.js";
import { bind, enhanceReducer } from 'redux-yjs-bindings';

const yDoc = new Doc();

const settings = {
    roomName: "com.github.cdwishlist",
    password: undefined,
    rootDoc: yDoc,
    signalUris: [
      //"wss://signaling.yjs.dev",
      //"wss://y-webrtc-signaling-eu.herokuapp.com",
      //"wss://y-webrtc-signaling-us.herokuapp.com",
    ],
  };


  // possible servers?
  // https://docs.deno.com/examples/http_server_websocket/
  // https://github.com/yjs/y-webrtc/blob/master/bin/server.js


const persistence = new IndexeddbPersistence("com.github.cdwishlist", yDoc);
const provider = new WebrtcProvider(settings.roomName, yDoc, {
  password: settings.password,
  signaling: settings.signalUris,
  awareness: new awarenessProtocol.Awareness(yDoc),
});


const store = configureStore({
  reducer: {
    wishlist: enhanceReducer(wishlistReducer),
    settings: enhanceReducer(settingsReducer)
  },
});

bind(yDoc, store, 'wishlist');

export default store;


// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
// Use throughout your app instead of plain `useDispatch` and `useSelector`
