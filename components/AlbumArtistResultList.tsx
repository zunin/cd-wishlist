import { type FC, Fragment } from "hono/jsx";
import { Release } from "../models/Release.ts";
import { MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";

const AlbumArtistResult: FC<
  {
    wishlist: Array<string>;
    result: { musicBrainz: MusicbrainzMeta; available: Release[] };
  }
> = (props) => {
  const { result: { musicBrainz, available }, wishlist } = props;
  return (
    <div
      class="box invert"
      key={musicBrainz.releaseGroupId}
      style={{ maxWidth: "300px", padding: "1em" }}
      hx-target="this"
      hx-swap="outerHTML"
    >
      <div class="stack">
        <div class="stack">
          <h2>{musicBrainz.artist}</h2>
          <p>{musicBrainz.albumTitle}</p>
        </div>

        <div class="frame">
          <img
            src={`https://coverartarchive.org/release-group/${musicBrainz.releaseGroupId}/front`}
          >
          </img>
        </div>

        {available.length !== 0
          ? available.map((record) => {
            return (
              <p key={record.origin}>
                {record.price} at{" "}
                <a href={record.origin}>{URL.parse(record.origin)?.host}</a>
              </p>
            );
          })
          : <Fragment></Fragment>}

        {wishlist.some((id) => musicBrainz.releaseGroupId === id)
          ? (
            <button
              type="button"
              hx-trigger="click"
              onclick={"localStorage.setItem('wishlist', JSON.stringify( [...new Set([...(JSON.parse(localStorage.getItem('wishlist')) || [])].filter(cache => cache !== '"+musicBrainz.releaseGroupId+"')  )]  ))"}
              hx-get="/api/releaseGroupByIds"
              hx-vals="js:{id: JSON.parse(localStorage.getItem('wishlist'))}"
              hx-target="#wishlist"
              hx-swap="innerHTML"
            >
              Remove from wishlist
            </button>
          )
          : (
            <button
              type="button"
              hx-trigger="click"
              onclick={"localStorage.setItem('wishlist', JSON.stringify( [...new Set([...(JSON.parse(localStorage.getItem('wishlist')) || []), '"+musicBrainz.releaseGroupId+"'])]  ))"}
              hx-get="/api/releaseGroupByIds"
              hx-vals="js:{id: JSON.parse(localStorage.getItem('wishlist'))}"
              hx-target="#wishlist"
              hx-swap="innerHTML"
            >
              Add to wishlist
            </button>
          )}
      </div>
    </div>
  );
};
const AlbumArtistResultList: FC<
  {
    wishlist: Array<string>;
    results: Array<{ musicBrainz: MusicbrainzMeta; available: Release[] }>;
  }
> = (props) => {
  const { results, wishlist } = props;
  return (
    <div class="grid">
      {results.map((meta) => {
        return <AlbumArtistResult key={meta.musicBrainz.releaseGroupId} result={meta} wishlist={wishlist}></AlbumArtistResult>
      })}
    </div>
  );
};

export const AlbumArtistResultListComponent = (
  wishlist: Array<string>,
  results: Array<{ musicBrainz: MusicbrainzMeta; available: Release[] }>,
) => (
  <AlbumArtistResultList wishlist={wishlist} results={results}>
  </AlbumArtistResultList>
);
