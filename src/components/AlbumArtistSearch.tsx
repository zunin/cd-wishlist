import {
    type FC, // @ts-types="react"
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
    const [artistSuggestions, setArtistSuggestions] = useState<string[]>([]);
    const [showArtistSuggestions, setShowArtistSuggestions] = useState(false);
    const [justSelectedArtist, setJustSelectedArtist] = useState(false);
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

    // Artist autocomplete effect
    useEffect(() => {
        if (!artistQuery || artistQuery.length < 2) {
            setArtistSuggestions([]);
            return;
        }

        if (justSelectedArtist) {
            setJustSelectedArtist(false);
            return;
        }

        const handler = setTimeout(async () => {
            const artists = await musicBrainzClient.getArtists(artistQuery);
            setArtistSuggestions(artists.map((a) => a.name).slice(0, 8));
            setShowArtistSuggestions(true);
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [artistQuery, musicBrainzClient, justSelectedArtist]);

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
        <div className="stack" style={{ "--space": "var(--s-1)" }}>
            <div className="switcher" style={{ "--switcher-target": "16rem" }}>
                <div className="stack" style={{ "--space": "0.25rem" }}>
                    <label htmlFor="artist">Artist:</label>
                    <div style={{ position: "relative" }}>
                        <input
                            type="text"
                            name="artist"
                            value={artistQuery}
                            onChange={(e) => setArtistQuery(e.target.value)}
                            onFocus={() => setShowArtistSuggestions(true)}
                            onBlur={() =>
                                setTimeout(
                                    () => setShowArtistSuggestions(false),
                                    200,
                                )
                            }
                        />
                        {showArtistSuggestions &&
                            artistSuggestions.length > 0 && (
                                <ul
                                    className="suggestions-list"
                                    style={{
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        background: "var(--col-bg)",
                                        border: "1px solid var(--col-border)",
                                        borderRadius: "var(--r-2)",
                                        margin: 0,
                                        padding: 0,
                                        listStyle: "none",
                                        zIndex: 10,
                                        maxHeight: "200px",
                                        overflowY: "auto",
                                    }}
                                >
                                    {artistSuggestions.map((name, i) => (
                                        <li
                                            key={i}
                                            style={{
                                                padding:
                                                    "var(--s-1) var(--s-2)",
                                                cursor: "pointer",
                                            }}
                                            onMouseDown={() => {
                                                setJustSelectedArtist(true);
                                                setArtistQuery(name);
                                                setShowArtistSuggestions(false);
                                                setArtistSuggestions([]);
                                            }}
                                        >
                                            {name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </div>
                </div>
                <div className="stack" style={{ "--space": "0.25rem" }}>
                    <label htmlFor="albumtitle">Album:</label>
                    <input
                        type="text"
                        name="albumTitle"
                        onChange={(e) => setAlbumQuery(e.target.value)}
                    />
                </div>
            </div>
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
