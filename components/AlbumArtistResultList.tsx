import { Fragment, type FC } from "hono/jsx";
import { Release } from "../models/Release.ts";
import { MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";

const AlbumArtistResultList: FC<{ wishlist: Array<string>, results: Array<{musicBrainz: MusicbrainzMeta, available: Release[]}> }> = (props) => {
  const { results, wishlist } = props;
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

            {wishlist.some(id => musicBrainz.releaseGroupId === id) ?
              <button 
              type="button"
              hx-trigger="click"
              onclick="localStorage.setItem('wishlist', JSON.stringify( [...new Set([...(JSON.parse(localStorage.getItem('wishlist')) || [])].filter(cache => cache !== this.parentElement.parentElement.getAttribute('key'))  )]  ))"
              >Remove from wishlist</button> : 
              <button 
                type="button"
                hx-trigger="click"
                onclick="localStorage.setItem('wishlist', JSON.stringify( [...new Set([...(JSON.parse(localStorage.getItem('wishlist')) || []), this.parentElement.parentElement.getAttribute('key')])]  ))"
              >Add to wishlist</button>
            }
            
            
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const AlbumArtistResultListComponent = (wishlist: Array<string>, results: Array<{musicBrainz: MusicbrainzMeta, available: Release[]}>) => (
  <AlbumArtistResultList wishlist={wishlist} results={results}></AlbumArtistResultList>
);
