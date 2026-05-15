import {
    FC, // @ts-types="react"
    useEffect,
    useMemo,
    useState,
} from "react";
import { AlbumArtistResultList } from "./AlbumArtistResultList.tsx";
import { MusicBrainzClient } from "../musicbrainzclient.ts";
import { type MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";
import { type Release } from "../models/Release.ts";
import { useAppSelector } from "../reduxhooks.ts";

export const Wishlist: FC<{
    releases: Array<Release>;
}> = ({ releases }) => {
    const wishlist = useAppSelector((state) => state.wishlist.ids);

    // Derive a Set of wishlist IDs once at top level for O(1) lookup
    const wishlistIdSet = useMemo(
        () => new Set(wishlist.map((item) => item.id)),
        [wishlist],
    );

    const [results, setResults] = useState(
        [] as Array<{
            musicBrainz: MusicbrainzMeta;
            available: Release[];
            isInWishlist: boolean;
        }>,
    );
    const [isLoading, setIsLoading] = useState(false);
    const [musicBrainzClient] = useState(new MusicBrainzClient());

    useEffect(() => {
        async function fetch() {
            if (wishlist.length === 0) {
                setResults([]);
                return;
            }

            setIsLoading(true);
            try {
                // Deduplicate wishlist IDs before fetching to avoid redundant API calls
                const uniqueIds = [
                    ...new Map(
                        wishlist.map((item) => [item.id, item]),
                    ).values(),
                ];
                const metaPromises = uniqueIds.map((item) =>
                    musicBrainzClient.getMusicBrainzHit(item.id),
                );
                const res = await Promise.all<MusicbrainzMeta>(metaPromises);
                setResults(
                    res
                        .filter((x) => !!x)
                        .map((meta) => {
                            return {
                                musicBrainz: meta,
                                available: releases.filter(
                                    (r) =>
                                        r.musicbrainz?.releaseGroupId ===
                                        meta.releaseGroupId,
                                ),
                                isInWishlist: wishlistIdSet.has(
                                    meta.releaseGroupId!,
                                ),
                            };
                        }),
                );
            } finally {
                setIsLoading(false);
            }
        }

        fetch();
    }, [wishlist, wishlistIdSet, musicBrainzClient, releases]);

    return (
        <div>
            <h2>Wishlist</h2>
            <AlbumArtistResultList
                results={results}
                isLoading={isLoading}
                skeletonCount={wishlist.length > 0 ? wishlist.length : 3}
            ></AlbumArtistResultList>
        </div>
    );
};
