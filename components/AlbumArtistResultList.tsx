import { type FC, Fragment } from "hono/jsx";
import { Release } from "../models/Release.ts";
import { MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";

const Header: FC<{musicBrainz: MusicbrainzMeta}> = ({musicBrainz}) => 
<div class="stack">
  <h2>{musicBrainz.artist}</h2>
  <p>{musicBrainz.albumTitle}</p>
</div>;

const Centered: FC<{ musicBrainz: MusicbrainzMeta}> = ({musicBrainz}) => 
<img
      style={{maxHeight: "250px", maxWidth: "250"}}
      src={`https://coverartarchive.org/release-group/${musicBrainz.releaseGroupId}/front-250`}
  />

const Footer: FC<{musicBrainz: MusicbrainzMeta, wishlist: Array<string>, available: Release[]}> = ({musicBrainz, wishlist, available}) => 
<div class="stack">
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
      onclick={`localStorage.setItem('wishlist', JSON.stringify( [...new Set([...(JSON.parse(localStorage.getItem('wishlist')) || [])].filter(cache => cache !== '${musicBrainz.releaseGroupId}')  )]  ))`}
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
      onclick={`localStorage.setItem('wishlist', JSON.stringify( [...new Set([...(JSON.parse(localStorage.getItem('wishlist')) || []), '${musicBrainz.releaseGroupId}'])]  ))`}
      hx-get="/api/releaseGroupByIds"
      hx-vals="js:{id: JSON.parse(localStorage.getItem('wishlist'))}"
      hx-target="#wishlist"
      hx-swap="innerHTML"
    >
      Add to wishlist
    </button>
  )}
</div>;

const Cover: FC<{
    wishlist: Array<string>;
    result: { musicBrainz: MusicbrainzMeta; available: Release[] };
  }> = ({wishlist, result: {available, musicBrainz}}) => 
<div class="cover" style={{height: "100%"}}>
  <Header musicBrainz={musicBrainz} ></Header>
  <Centered musicBrainz={musicBrainz}></Centered>
  <Footer musicBrainz={musicBrainz} wishlist={wishlist} available={available}></Footer>
</div>


const AlbumArtistResult: FC<
  {
    wishlist: Array<string>;
    result: { musicBrainz: MusicbrainzMeta; available: Release[] };
  }
> = ({ result: { musicBrainz, available }, wishlist }) => {
    
  return (
    <div
      class="box invert"
      key={musicBrainz.releaseGroupId}
      style={{ maxWidth: "300px", padding: "1em" }}
      hx-target="this"
      hx-swap="outerHTML"
    >
      <Cover result={{musicBrainz, available}} wishlist={wishlist} ></Cover>
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
        return (
          <AlbumArtistResult
            key={meta.musicBrainz.releaseGroupId}
            result={meta}
            wishlist={wishlist}
          >
          </AlbumArtistResult>
        );
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
