import { // @ts-types="react"
  FC,
  useEffect,
  useState,
} from "react";
import { type Release } from "./models/Release.ts";
import { AlbumArtistSearch } from "./components/AlbumArtistSearch.tsx";
import { Wishlist } from "./components/Wishlist.tsx";
import { SyncStatus } from "./components/SyncStatus.tsx";
import { SyncDebug } from "./components/SyncDebug.tsx";
import { SettingsPage } from "./components/SettingsPage.tsx";
import { Provider } from "react-redux";
import store from "./store.ts";

type View = "main" | "settings";

const App: FC = () => {
  const [releases, setReleases] = useState([] as Array<Release>);
  const [view, setView] = useState<View>("main");

  useEffect(() => {
    async function createRequest() {
      const res = await fetch(
        "https://raw.githubusercontent.com/zunin/cd6000.dk-history/e5d87d0efff0707e7538c098fe370598337f0199/cds.json",
      );
      setReleases(await res.json() as Array<Release>);
    }
    createRequest();
  }, []);

  return (
    <>
      <Provider store={store}>
      <nav className="app-nav">
        <button
          type="button"
          className={view === "main" ? "active" : ""}
          onClick={() => setView("main")}
        >
          Wishlist
        </button>
        <button
          type="button"
          className={view === "settings" ? "active" : ""}
          onClick={() => setView("settings")}
        >
          Settings
        </button>
      </nav>
      <SyncStatus />
      {view === "main" && (
        <>
          <SyncDebug />
          <h1>Get notified when used CD markets have your cd</h1>
          <legend>Items to subscribe to</legend>
          <AlbumArtistSearch releases={releases} />
          <Wishlist releases={releases} />
        </>
      )}
      {view === "settings" && <SettingsPage />}
      </Provider>
      </>
  );
};

export default App;
