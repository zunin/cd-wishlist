import { FC } from "react";

export const AlbumArtistSearch: FC = (props) => {
  return (
    <div>
      <label htmlFor="artist">Artist:</label>
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
        hx-indicator="#throbber"
      />
      <label htmlFor="albumtitle">Album:</label>
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
        hx-indicator="#throbber"
      />
      <img
        id="throbber"
        className="htmx-indicator"
        src="https://upload.wikimedia.org/wikipedia/commons/f/f8/Ajax-loader%282%29.gif"
      />
      <div id="searchArea"></div>
    </div>
  );
};
