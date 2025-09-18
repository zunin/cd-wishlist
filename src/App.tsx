import { // @ts-types="react"
  FC,
  useEffect,
  useState,
} from "react";
import { type Release } from "./models/Release.ts";
import { AlbumArtistSearch } from "./components/AlbumArtistSearch.tsx";
import { Wishlist } from "./components/Wishlist.tsx";
import { Provider } from "react-redux";
import store from "./store.ts";

const App: FC = () => {
  const [releases, setReleases] = useState([] as Array<Release>);
  useEffect(() => {
    async function createRequest() {
      const res = await fetch(
        "https://raw.githubusercontent.com/zunin/cd6000.dk-history/e5d87d0efff0707e7538c098fe370598337f0199/cds.json",
      );
      //const res = await fetch("https://raw.githubusercontent.com/zunin/cd6000.dk-history/refs/heads/main/cds.json")
      setReleases(await res.json() as Array<Release>);
    }
    createRequest();
  }, []);

  return (
    <>
      <Provider store={store}>
      <h1>Get notified when used CD markets have your cd</h1>
      <legend>Items to subscribe to</legend>
      
      <AlbumArtistSearch
        releases={releases}
      >
      </AlbumArtistSearch>
      <Wishlist
        releases={releases}
      >
      </Wishlist>
      </Provider>
      </>
  );
};

export default App;
