import { type Release } from "../models/Release.ts";
import { type MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";
import { FC } from "react";
import { useAppDispatch, useAppSelector } from "../reduxhooks.ts";
import { addItem, removeItem } from "../store/wishlist.ts";

const Header: FC<{ musicBrainz: MusicbrainzMeta }> = ({ musicBrainz }) => (
  <div className="stack">
    <h2>{musicBrainz.artist}</h2>
    <p>{musicBrainz.albumTitle}</p>
  </div>
);

const Centered: FC<{ musicBrainz: MusicbrainzMeta }> = ({ musicBrainz }) => (
  <img
    style={{ maxHeight: "250px", maxWidth: "250" }}
    src={`https://coverartarchive.org/release-group/${musicBrainz.releaseGroupId}/front-250`}
    alt={`Cover art for ${musicBrainz.albumTitle} by ${musicBrainz.artist}`}
  />
);

const Footer: FC<{ musicBrainz: MusicbrainzMeta; available: Release[] }> =
  function ({ musicBrainz, available }) {
    const wishlist = useAppSelector((state) => state.wishlist.ids);
    const dispatch = useAppDispatch();

    return (
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
          : undefined}
        {wishlist.some((item) => musicBrainz.releaseGroupId === item.id)
          ? (
            <button
              type="button"
              onClick={() =>
                dispatch(removeItem({ id: musicBrainz.releaseGroupId! }))}
            >
              Remove from wishlist
            </button>
          )
          : (
            <button
              type="button"
              onClick={() =>
                dispatch(addItem({ id: musicBrainz.releaseGroupId! }))}
            >
              Add to wishlist
            </button>
          )}
      </div>
    );
  };

const Cover: FC<{
  result: { musicBrainz: MusicbrainzMeta; available: Release[] };
}> = ({ result: { available, musicBrainz } }) => (
  <div className="cover" style={{ height: "100%" }}>
    <Header musicBrainz={musicBrainz}></Header>
    <Centered musicBrainz={musicBrainz}></Centered>
    <Footer musicBrainz={musicBrainz} available={available}></Footer>
  </div>
);

const AlbumArtistResult: FC<
  {
    result: { musicBrainz: MusicbrainzMeta; available: Release[] };
  }
> = ({ result: { musicBrainz, available } }) => {
  return (
    <div
      className="box invert"
      key={musicBrainz.releaseGroupId}
      style={{ maxWidth: "300px", padding: "1em" }}
    >
      <Cover result={{ musicBrainz, available }}></Cover>
    </div>
  );
};
const SkeletonCard: FC = () => (
  <div
    className="box invert skeleton-card"
    style={{ maxWidth: "300px", padding: "1em" }}
  >
    <div className="skeleton-header">
      <div className="skeleton-text skeleton-title"></div>
      <div className="skeleton-text skeleton-subtitle"></div>
    </div>
    <div className="skeleton-image"></div>
    <div className="skeleton-footer">
      <div className="skeleton-text skeleton-button"></div>
    </div>
  </div>
);

export const AlbumArtistResultList: FC<
  {
    results: Array<{ musicBrainz: MusicbrainzMeta; available: Release[] }>;
    isLoading?: boolean;
    skeletonCount?: number;
  }
> = (props) => {
  const { results, isLoading, skeletonCount = 3 } = props;
  
  if (isLoading) {
    return (
      <div className="grid">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <SkeletonCard key={`skeleton-${i}`} />
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid">
      {results.map((meta) => {
        return (
          <AlbumArtistResult
            key={meta.musicBrainz.releaseGroupId}
            result={meta}
          >
          </AlbumArtistResult>
        );
      })}
    </div>
  );
};

export const AlbumArtistResultListComponent = (
  results: Array<{ musicBrainz: MusicbrainzMeta; available: Release[] }>,
) => (
  <AlbumArtistResultList
    results={results}
  >
  </AlbumArtistResultList>
);
