import { type Release } from "../models/Release.ts";
import { type MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";
import { FC, memo, useState, useCallback } from "react";
import { useAppDispatch } from "../reduxhooks.ts";
import { addItem, removeItem } from "../store/wishlist.ts";

// Cover Art component with lazy loading and error handling
const CoverArt: FC<{ musicBrainz: MusicbrainzMeta }> = memo(
    ({ musicBrainz }) => {
        const [hasError, setHasError] = useState(false);
        const [isLoading, setIsLoading] = useState(true);
        const [retryKey, setRetryKey] = useState(0);

        const handleError = useCallback(() => {
            setHasError(true);
            setIsLoading(false);
        }, []);

        const handleLoad = useCallback(() => {
            setIsLoading(false);
            setHasError(false);
        }, []);

        const handleRetry = useCallback(() => {
            setHasError(false);
            setIsLoading(true);
            setRetryKey((prev) => prev + 1);
        }, []);

        const imageUrl = `https://coverartarchive.org/release-group/${musicBrainz.releaseGroupId}/front-250?retry=${retryKey}`;

        if (hasError) {
            return (
                <div className="cover-art-error">
                    <div className="music-note-icon">
                        <svg
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="64"
                            height="64"
                        >
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                    </div>
                    <button
                        type="button"
                        className="btn btn--small btn--retry"
                        onClick={handleRetry}
                    >
                        Retry
                    </button>
                </div>
            );
        }

        return (
            <div className="cover-art-container">
                {isLoading && (
                    <div className="cover-art-loading">
                        <div className="skeleton-image" />
                    </div>
                )}
                <img
                    style={{
                        maxHeight: "250px",
                        maxWidth: "250px",
                        opacity: isLoading ? 0 : 1,
                        transition: "opacity 0.3s ease-in-out",
                    }}
                    src={imageUrl}
                    alt={`Cover art for ${musicBrainz.albumTitle} by ${musicBrainz.artist}`}
                    loading="lazy"
                    onError={handleError}
                    onLoad={handleLoad}
                />
            </div>
        );
    },
);

const Header: FC<{ musicBrainz: MusicbrainzMeta }> = memo(({ musicBrainz }) => (
    <div className="stack">
        <h2>{musicBrainz.artist}</h2>
        <p>{musicBrainz.albumTitle}</p>
    </div>
));

const Centered: FC<{ musicBrainz: MusicbrainzMeta }> = memo(
    ({ musicBrainz }) => <CoverArt musicBrainz={musicBrainz} />,
);

const Footer: FC<{
    musicBrainz: MusicbrainzMeta;
    available: Release[];
    isInWishlist: boolean;
}> = memo(function ({ musicBrainz, available, isInWishlist }) {
    const dispatch = useAppDispatch();

    return (
        <div className="stack">
            {available.length !== 0
                ? available.map((record) => {
                      return (
                          <p key={record.origin}>
                              {record.price} at{" "}
                              <a href={record.origin}>
                                  {URL.parse(record.origin)?.host}
                              </a>
                          </p>
                      );
                  })
                : undefined}
            {isInWishlist ? (
                <button
                    type="button"
                    onClick={() =>
                        dispatch(
                            removeItem({ id: musicBrainz.releaseGroupId! }),
                        )
                    }
                >
                    Remove from wishlist
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() =>
                        dispatch(addItem({ id: musicBrainz.releaseGroupId! }))
                    }
                >
                    Add to wishlist
                </button>
            )}
        </div>
    );
});

const Cover: FC<{
    result: {
        musicBrainz: MusicbrainzMeta;
        available: Release[];
        isInWishlist: boolean;
    };
}> = memo(({ result: { available, musicBrainz, isInWishlist } }) => (
    <div className="cover" style={{ height: "100%" }}>
        <Header musicBrainz={musicBrainz}></Header>
        <Centered musicBrainz={musicBrainz}></Centered>
        <Footer
            musicBrainz={musicBrainz}
            available={available}
            isInWishlist={isInWishlist}
        ></Footer>
    </div>
));

const AlbumArtistResult: FC<{
    result: {
        musicBrainz: MusicbrainzMeta;
        available: Release[];
        isInWishlist: boolean;
    };
}> = memo(({ result: { musicBrainz, available, isInWishlist } }) => {
    return (
        <div
            className="box invert"
            key={musicBrainz.releaseGroupId}
            style={{ maxWidth: "300px", padding: "1em" }}
        >
            <Cover result={{ musicBrainz, available, isInWishlist }}></Cover>
        </div>
    );
});
const SkeletonCard: FC = memo(() => (
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
));

export const AlbumArtistResultList: FC<{
    results: Array<{
        musicBrainz: MusicbrainzMeta;
        available: Release[];
        isInWishlist: boolean;
    }>;
    isLoading?: boolean;
    skeletonCount?: number;
}> = (props) => {
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
                    ></AlbumArtistResult>
                );
            })}
        </div>
    );
};

export const AlbumArtistResultListComponent = (
    results: Array<{
        musicBrainz: MusicbrainzMeta;
        available: Release[];
        isInWishlist: boolean;
    }>,
) => <AlbumArtistResultList results={results}></AlbumArtistResultList>;
