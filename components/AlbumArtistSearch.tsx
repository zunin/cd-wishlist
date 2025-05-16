import { type FC } from "hono/jsx";

export const AlbumArtistSearch: FC = (props) => {
  return (
    <div>
      <label for="artist">Artist:</label>
      <input 
        type="text"
        name="artist"
        hx-get="/api/releaseGroup"
        hx-include="[name='albumTitle']"
        hx-trigger="input changed delay:1s"
        hx-headers='{"Accept": "text/html"}'
        hx-target="#searchArea"
        hx-swap="innerHTML" 
        hx-vals="js:{id: JSON.parse(localStorage.getItem('wishlist'))}"

      />
      <label for="albumtitle">Album:</label>
      <input 
        type="text"
        name="albumTitle"
        hx-get="/api/releaseGroup"
        hx-include="[name='artist']"
        hx-trigger="input changed delay:1s, load"
        hx-headers='{"Accept": "text/html"}'
        hx-target="#searchArea"
        hx-swap="innerHTML" 
        hx-vals="js:{id: JSON.parse(localStorage.getItem('wishlist'))}"

      />
      <div id="searchArea">No idea</div>
    </div>

  );
};

