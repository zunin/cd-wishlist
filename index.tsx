import { type FC, Fragment, InputEvent, useState } from "hono/jsx";
import { render } from "hono/jsx/dom";
import { MusicbrainzMeta, Release, ReleaseSchema } from "./models/Release.ts";
import { resourceLimits } from "node:worker_threads";

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
      />
      <label for="albumtitle">Album:</label>
      <input
        type="text"
        name="albumTitle"
        hx-get="/api/releaseGroup"
        hx-include="[name='artist']"
        hx-trigger="input changed delay:1s"
        hx-headers='{"Accept": "text/html"}'
        hx-target="#searchArea"
        hx-swap="innerHTML"  
      />
      <div id="searchArea">No idea</div>
    </div>
    
  );
};
export const AlbumArtistResultListComponent = (results: MusicbrainzMeta[]) => <AlbumArtistResultList results={results} ></AlbumArtistResultList>


const AlbumArtistResultList: FC<{results: MusicbrainzMeta[]}> = (
  {results}
) => {
  return (
    <Fragment>
      {results.map((mbMeta) => {
        return <Fragment key={mbMeta.releaseGroupId}>
          <p>
          artist: '{mbMeta.artist}'<p>
          </p>{" "}
          album: '{mbMeta.albumTitle}'
        </p>
        <br/>
        </Fragment>
      })}
      
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
