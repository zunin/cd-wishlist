import {
    // @ts-types="react"
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
import { ImportPage } from "./components/ImportPage.tsx";
import { UpdateNotification } from "./components/UpdateNotification.tsx";
import { Provider } from "react-redux";
import store, { updateSettingsFromUrl } from "./store.ts";
import { useAppSelector } from "./reduxhooks.ts";
import { useAppDispatch } from "./reduxhooks.ts";
import { clearCurrentImport } from "./store/importQueue.ts";

type View = "main" | "settings" | "debug" | "import";

const AppContent: FC = () => {
    const [releases, setReleases] = useState([] as Array<Release>);
    const [view, setView] = useState<View>("main");
    const dataSources = useAppSelector((state) => state.settings.dataSources);
    const dispatch = useAppDispatch();
    const importStatus = useAppSelector(
        (state) => state.importQueue.currentImport.status,
    );

    useEffect(() => {
        updateSettingsFromUrl();
    }, []);

    // Clear current import when navigating away from import view
    useEffect(() => {
        if (view !== "import" && importStatus !== "idle") {
            dispatch(clearCurrentImport());
        }
    }, [view, importStatus, dispatch]);

    useEffect(() => {
        async function createRequest() {
            const allReleases: Array<Release> = [];
            for (const url of dataSources) {
                try {
                    const res = await fetch(url);
                    const data = (await res.json()) as Array<Release>;
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
            <nav
                className="repel"
                style={{
                    paddingBottom: "0",
                    marginBottom: "var(--s1)",
                }}
            >
                <div className="cluster" style={{ "--space": "0.5rem" }}>
                    <button
                        type="button"
                        className={
                            view === "main"
                                ? "active btn btn--nav"
                                : "btn btn--nav"
                        }
                        onClick={() => setView("main")}
                    >
                        Wishlist
                    </button>
                    <button
                        type="button"
                        className={
                            view === "import"
                                ? "active btn btn--nav"
                                : "btn btn--nav"
                        }
                        onClick={() => setView("import")}
                    >
                        Import
                    </button>
                    <button
                        type="button"
                        className={
                            view === "settings"
                                ? "active btn btn--nav"
                                : "btn btn--nav"
                        }
                        onClick={() => setView("settings")}
                    >
                        Settings
                    </button>
                    <button
                        type="button"
                        className={
                            view === "debug"
                                ? "active btn btn--nav"
                                : "btn btn--nav"
                        }
                        onClick={() => setView("debug")}
                    >
                        Debug
                    </button>
                </div>
                <SyncStatus />
            </nav>
            {view === "main" && (
                <div className="stack" style={{ "--space": "var(--s1)" }}>
                    <div className="center" style={{ "--center-max": "75rem" }}>
                        <h1>Get notified when used CD markets have your CD</h1>
                    </div>
                    <div className="center" style={{ "--center-max": "75rem" }}>
                        <h2>Items to subscribe to</h2>
                        <AlbumArtistSearch releases={releases} />
                    </div>
                    <Wishlist releases={releases} />
                </div>
            )}
            {view === "settings" && <SettingsPage />}
            {view === "debug" && <SyncDebug />}
            {view === "import" && <ImportPage />}
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
