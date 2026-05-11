import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
// @ts-types="react"
import { // @ts-types="react"
  useEffect,
  useState,
} from "react";
import * as awarenessProtocol from "y-protocols/awareness.js";

interface Settings {
  roomName: string;
  readonly rootDoc: Y.Doc;
  password: string | undefined;
  signalUris: Array<string>;
}



export default function UseSettings(): [Settings, React.Dispatch<React.SetStateAction<Settings>>] {
  const [yDoc, setYDoc] = useState(new Y.Doc());
  const [settings, setSettings] = useState({
    roomName: "com.github.cdwishlist",
    password: undefined,
    rootDoc: yDoc,
    signalUris: [
      "wss://signaling.yjs.dev",
      "wss://y-webrtc-signaling-eu.herokuapp.com",
      "wss://y-webrtc-signaling-us.herokuapp.com",
    ],
  } as Settings);
  useEffect(() => {
    const persistence = new IndexeddbPersistence("com.github.cdwishlist", yDoc);

    const provider = new WebrtcProvider(settings.roomName, yDoc, {
      password: settings.password,
      signaling: settings.signalUris,
      awareness: new awarenessProtocol.Awareness(yDoc),
    });
  }, [settings, yDoc]);
  
  return [settings, setSettings];

}
