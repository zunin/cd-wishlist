import {
    FC, // @ts-types="react"
    useEffect,
    useMemo,
    useState,
} from "react";
import { MusicBrainzClient } from "../musicbrainzclient.ts";
import { type MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";
import { AlbumArtistResultList } from "./AlbumArtistResultList.tsx";
import { type Release } from "../models/Release.ts";
import { useAppSelector } from "../reduxhooks.ts";

export const AlbumArtistSearch: FC<{
    releases: Array<Release>;
}> = ({ releases }) => {
    const wishlist = useAppSelector((state) => state.wishlist.ids);

    // Derive a Set of wishlist IDs once at top level for O(1) lookup
    const wishlistIdSet = useMemo(
        () => new Set(wishlist.map((item) => item.id)),
        [wishlist],
    );

    const [artistQuery, setArtistQuery] = useState("");
    const [albumQuery, setAlbumQuery] = useState("");
    const [searchHits, setSearchHits] = useState([] as MusicbrainzMeta[]);
    const [albumARtistResultList, setAlbumARtistResultList] = useState(
        [] as Array<{
            musicBrainz: MusicbrainzMeta;
            available: Release[];
            isInWishlist: boolean;
        }>,
    );

    const [musicBrainzClient] = useState(new MusicBrainzClient());

    useEffect(() => {
        // Set a timeout to update debounced value after 500ms
        const handler = setTimeout(async () => {
            if (!!artistQuery || !!albumQuery) {
                setSearchHits(
                    (await musicBrainzClient.getMusicBrainzHits(
                        artistQuery,
                        albumQuery,
                    )) ?? [],
                );
            }
        }, 1000);

        // Cleanup the timeout if `query` changes before 500ms
        return () => {
            clearTimeout(handler);
        };
    }, [artistQuery, albumQuery, musicBrainzClient]);

    useEffect(() => {
        setAlbumARtistResultList(
            searchHits.map((hit: MusicbrainzMeta) => {
                return {
                    available: releases.filter(
                        (x) =>
                            x.musicbrainz?.releaseGroupId ===
                            hit.releaseGroupId,
                    ),
                    musicBrainz: hit,
                    isInWishlist: wishlistIdSet.has(hit.releaseGroupId!),
                };
            }),
        );
    }, [searchHits, releases, wishlistIdSet]);

    return (
        <div>
            <label htmlFor="artist">Artist:</label>
            <input
                type="text"
                name="artist"
                onChange={(e) => setArtistQuery(e.target.value)}
            />
            <label htmlFor="albumtitle">Album:</label>
            <input
                type="text"
                name="albumTitle"
                onChange={(e) => setAlbumQuery(e.target.value)}
            />
            <img
                id="throbber"
                className="htmx-indicator"
                src="https://upload.wikimedia.org/wikipedia/commons/f/f8/Ajax-loader%282%29.gif"
            />
            <div id="searchArea">
                <AlbumArtistResultList
                    results={albumARtistResultList}
                ></AlbumArtistResultList>
            </div>
        </div>
    );
};
