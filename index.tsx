import { type FC } from "hono/jsx";
import { Style, css } from "hono/css";
import { AlbumArtistSearch } from "./components/AlbumArtistSearch.tsx";

const bodyClass = css`
    margin: 1em;
`;

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
         <Style>{css`
          .stack {
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
          }

          .stack > * {
            margin-block: 0;
          } 

          .stack > * + * {
            margin-block-start: var(--space, 1.5rem);
          }
          .box {
            padding: var(--s1);
            border: var(--border-thin) solid;
            --color-light: #fff;
            --color-dark: #000;
            color: var(--color-dark);
            background-color: var(--color-light);
          }

          .box * {
            color: inherit;
          }

          .box.invert {
            color: var(--color-light);
            background-color: var(--color-dark);
          }

          .cluster {
            display: flex;
            flex-wrap: wrap;
            gap: var(--space, 1rem);
            justify-content: flex-start;
            align-items: center;
          }

          .grid {
            display: grid;
            grid-gap: 1rem;
          }

          @supports (width: min(250px, 100%)) {
            .grid {
              grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
            }
          }


          .with-sidebar {
            display: flex;
            flex-wrap: wrap;
            gap: var(--s1);
          }

          .with-sidebar > :first-child {
            flex-grow: 1;
          }

          .with-sidebar > :last-child {
            flex-basis: 0;
            flex-grow: 999;
            min-inline-size: 50%;
          }
            
          .frame {
            --n: 300;
            --d: 218;
            aspect-ratio: var(--n) / var(--d);
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .frame > img,
          .frame > video {
            inline-size: 100%;
            block-size: 100%;
            object-fit: cover;
          }

         `}</Style>
      </head>
      <body class={bodyClass}>
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




const App: FC = (props) => {
  return (
    <Layout>
      <h1>Get notified when used CD markets have your cd</h1>
      <form id="form">
        <fieldset id="fieldset">
          <legend>Items to subscribe to</legend>
          <AlbumArtistSearch></AlbumArtistSearch>
        </fieldset>
        <br />
        <button
          type="button"
          id="addrow"
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
