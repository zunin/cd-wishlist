import { Fragment, type FC } from "hono/jsx";
import { Release } from "../models/Release.ts";
import { MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";

const AlbumArtistResultList: FC<{ results: Array<{musicBrainz: MusicbrainzMeta, available: Release[]}> }> = (props) => {
  const { results } = props;
  return (
    <div class="grid">
      {results.map((meta) => {
        const { musicBrainz, available } = meta;
        return (
          <div class="box invert" key={musicBrainz.releaseGroupId} style={{maxWidth: "300px", padding: "1em"}}>
            <div class="stack">
            <div class="stack">
              <h2>{musicBrainz.artist}</h2>
              <p>{musicBrainz.albumTitle}</p>
            </div>

            <div class="frame" >
              <img
                src={`https://coverartarchive.org/release-group/${musicBrainz.releaseGroupId}/front`}
              >
              </img>
            </div>

            {available.length !== 0 ? available.map(record => {
              return <p key={record.origin}>{record.price} at <a href={record.origin}>{URL.parse(record.origin)?.host}</a></p>
            }) : <Fragment></Fragment>}

            <button type="button">Add to wishlist</button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const AlbumArtistResultListComponent = (results: Array<{musicBrainz: MusicbrainzMeta, available: Release[]}>) => (
  <AlbumArtistResultList results={results}></AlbumArtistResultList>
);
