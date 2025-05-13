import { type FC, Fragment, InputEvent, useState } from "hono/jsx";
import { render } from "hono/jsx/dom";

const Layout: FC = (props) => {
  return (
    <html>
      <head>
        <title>CD wishlist</title>
        <link
          rel="stylesheet"
          href="https://unpkg.com/marx-css/css/marx.min.css"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body style={{ margin: "1em" }}>
        {props.children}

        <script
          src="https://unpkg.com/htmx.org@2.0.4"
          integrity="sha384-HGfztofotfshcF7+8n44JQL2oJmowVChPTg48S+jvZoztPfvwD79OC/LTtG6dMp+"
          crossorigin="anonymous"
        >
        </script>
      </body>
    </html>
  );
};


const AlbumArtistSearch: FC = (props) => {
  const [artistQuery, setArtistQuery] = useState("album");
  const handleArtistQueryChange = (event: InputEvent) => {
    const value = event.target.value;
    setArtistQuery(value);
  };

  const [albumQuery, setAlbumQuery] = useState("");
  const handleAlbumQueryChange = (event: InputEvent) => {
    const value = event.target.value;

    setAlbumQuery(value);
  };

  return (
    <Fragment>
      <label for="artist">Artist:</label>
      <input
        type="text"
        name="artist"
        onChange={handleArtistQueryChange}
        value={artistQuery}
      />
      <label for="albumtitle">Album:</label>
      <input
        type="text"
        name="albumtitle"
        onChange={handleAlbumQueryChange}
        value={albumQuery}
      />
      <AlbumArtistResultList albumQuery={albumQuery} artistQuery={artistQuery}>
      </AlbumArtistResultList>
    </Fragment>
  );
};

export const AlbumArtistSearchCompoennt = <AlbumArtistSearch></AlbumArtistSearch>


const AlbumArtistResultList: FC<{ artistQuery: string; albumQuery: string }> = (
  { albumQuery, artistQuery },
) => {
  return (
    <Fragment>
      <p>
        artist: '{artistQuery}'<p>
        </p>{" "}
        album: '{albumQuery}'
      </p>
    </Fragment>
  );
};

const App: FC = (props) => {
  return (
    <Layout>
      <h1>Get notified when used CD markets have your cd</h1>
      <input type="hidden" name="subscriptionId" />
      <form id="form">
        <fieldset id="fieldset">
          <legend>Items to subscribe to</legend>
          <AlbumArtistSearch></AlbumArtistSearch>
        </fieldset>
        <br />
        <button
          type="button"
          id="addrow"
          hx-get="/api/availableAlbums"
          hx-headers='{"Accept": "text/html"}'
          hx-trigger="click"
          hx-target="fieldset"
          hx-swap="afterend"
        >
          Add item
        </button>
        <br />
        <br />
        <input type="submit" value="Submit" />
      </form>
    </Layout>
  );
};

export default <App />;
