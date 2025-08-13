import { type Release } from "../models/Release.ts";
import { type MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";
import { FC } from "react";

const Header: FC<{musicBrainz: MusicbrainzMeta}> = ({musicBrainz}) => 
<div className="stack">
  <h2>{musicBrainz.artist}</h2>
  <p>{musicBrainz.albumTitle}</p>
</div>;

const Centered: FC<{ musicBrainz: MusicbrainzMeta}> = ({musicBrainz}) => 
<img
      style={{maxHeight: "250px", maxWidth: "250"}}
      src={`https://coverartarchive.org/release-group/${musicBrainz.releaseGroupId}/front-250`}
  />

const Footer: FC<{musicBrainz: MusicbrainzMeta, wishList: Array<string>, setWishList: (wishList: Array<string>) => void, available: Release[]}> = ({musicBrainz, wishList, setWishList, available}) => 
<div className="stack">
  {available.length !== 0
    ? available.map((record) => {
      return (
        <p key={record.origin}>
          {record.price} at{" "}
          <a href={record.origin}>{URL.parse(record.origin)?.host}</a>
        </p>
      );
    })
    : <></>}
  {(wishList).some((id) => musicBrainz.releaseGroupId === id)
  ? (
    <button
      type="button"
      onClick={() => setWishList(wishList.filter(wishListId => wishListId !== musicBrainz.releaseGroupId))}
    >
      Remove from wishlist
    </button>
  )
  : (
    <button
      type="button"
      onClick={() => setWishList([...wishList, musicBrainz.releaseGroupId!])}
    >
      Add to wishlist
    </button>
  )}
</div>;

const Cover: FC<{
    wishList: Array<string>; 
    setWishList: (wishList: Array<string>) => void;
    result: { musicBrainz: MusicbrainzMeta; available: Release[] };
  }> = ({wishList, setWishList, result: {available, musicBrainz}}) => 
<div className="cover" style={{height: "100%"}}>
  <Header musicBrainz={musicBrainz} ></Header>
  <Centered musicBrainz={musicBrainz}></Centered>
  <Footer musicBrainz={musicBrainz} wishList={wishList} setWishList={setWishList} available={available}></Footer>
</div>


const AlbumArtistResult: FC<
  {
    wishList: Array<string>; 
    setWishList: (wishList: Array<string>) => void;
    result: { musicBrainz: MusicbrainzMeta; available: Release[] };
  }
> = ({ result: { musicBrainz, available }, wishList, setWishList }) => {
    
  return (
    <div
      className="box invert"
      key={musicBrainz.releaseGroupId}
      style={{ maxWidth: "300px", padding: "1em" }}
      hx-target="this"
      hx-swap="outerHTML"
    >
      <Cover result={{musicBrainz, available}} wishList={wishList} setWishList={setWishList} ></Cover>
    </div>
  );
};
export const AlbumArtistResultList: FC<
  {
    wishList: Array<string>; 
    setWishList: (wishList: Array<string>) => void;
    results: Array<{ musicBrainz: MusicbrainzMeta; available: Release[] }>;
  }
> = (props) => {
  const { results, wishList, setWishList } = props;
  return (
    <div className="grid">
      {results.map((meta) => {
        return (
          <AlbumArtistResult
            key={meta.musicBrainz.releaseGroupId}
            result={meta}
            wishList={wishList}
            setWishList={setWishList}
          >
          </AlbumArtistResult>
        );
      })}
    </div>
  );
};

export const AlbumArtistResultListComponent = (
  wishList: Array<string>,
  results: Array<{ musicBrainz: MusicbrainzMeta; available: Release[] }>,
) => (
  <AlbumArtistResultList wishList={wishList} setWishList={() => {}} results={results}>
  </AlbumArtistResultList>
);
