import { type FC, Fragment } from "hono/jsx";
import { MusicbrainzMeta } from "../models/Release.ts";
import { css } from "hono/css";



const AlbumArtistResultList: FC<{ results: MusicbrainzMeta[] }> = (props) => {
  const { results } = props;
  return (
    <div class="grid">
      {results.map((mbMeta) => {
        return (
          <div class="box invert" key={mbMeta.releaseGroupId} style={{maxWidth: "300px", padding: "1em"}}>
            <div class="stack">
            <div class="stack">
              <h2>{mbMeta.artist}</h2>
              <p>{mbMeta.albumTitle}</p>
            </div>

            <div class="frame" >
              <img
                src={`https://coverartarchive.org/release-group/${mbMeta.releaseGroupId}/front`}
              >
              </img>
            </div>
            <button type="button">Add to wishlist</button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const AlbumArtistResultListComponent = (results: MusicbrainzMeta[]) => (
  <AlbumArtistResultList results={results}></AlbumArtistResultList>
);
