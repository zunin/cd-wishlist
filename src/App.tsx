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
import { UpdateNotification } from "./components/UpdateNotification.tsx";
import { Provider } from "react-redux";
import store, { updateSettingsFromUrl } from "./store.ts";
import { useAppSelector } from "./reduxhooks.ts";

type View = "main" | "settings" | "debug";

const AppContent: FC = () => {
  const [releases, setReleases] = useState([] as Array<Release>);
  const [view, setView] = useState<View>("main");
  const dataSources = useAppSelector((state) => state.settings.dataSources);

  useEffect(() => {
    updateSettingsFromUrl();
  }, []);

  useEffect(() => {
    async function createRequest() {
      const allReleases: Array<Release> = [];
      for (const url of dataSources) {
        try {
          const res = await fetch(url);
          const data = await res.json() as Array<Release>;
          allReleases.push(...data);
        } catch (e) {
          console.error(`Failed to fetch from ${url}:`, e);
        }
      }
      setReleases(allReleases);
    }
    createRequest();
  }, [dataSources]);

  return (
    <>
      <UpdateNotification />
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
        <button
          type="button"
          className={view === "debug" ? "active" : ""}
          onClick={() => setView("debug")}
        >
          Debug
        </button>
      </nav>
      <SyncStatus />
      {view === "main" && (
        <>
          <h1>Get notified when used CD markets have your cd</h1>
          <legend>Items to subscribe to</legend>
          <AlbumArtistSearch releases={releases} />
          <Wishlist releases={releases} />
        </>
      )}
      {view === "settings" && <SettingsPage />}
      {view === "debug" && <SyncDebug />}
    </>
  );
};

const App: FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
