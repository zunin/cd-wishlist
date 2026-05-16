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
    const [searchHits, setSearchHits] = useState([] as MusicbrainzMeta[]);
    const [albumARtistResultList, setAlbumARtistResultList] = useState(
        [] as Array<{
            musicBrainz: MusicbrainzMeta;
            available: Release[];
            isInWishlist: boolean;
        }>,
    );

    const [musicBrainzClient] = useState(new MusicBrainzClient());

    // Detect datalist support for mobile fallback
    // Firefox Android doesn't support datalist, other browsers do
    const [datalistSupported, setDatalistSupported] = useState(true);
    useEffect(() => {
        const isFirefoxAndroid =
            navigator.userAgent.includes("Firefox") &&
            /Android/.test(navigator.userAgent);
        setDatalistSupported(!isFirefoxAndroid);
    }, []);

    useEffect(() => {
        // Set a timeout to update debounced value after 500ms
        const handler = setTimeout(async () => {
            if (!artistQuery && !albumQuery) {
                setSearchHits([]);
                return;
            }
            setSearchHits(
                (await musicBrainzClient.getMusicBrainzHits(
                    artistQuery,
                    albumQuery,
                )) ?? [],
            );
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

        const handler = setTimeout(async () => {
            const artists = await musicBrainzClient.getArtists(artistQuery);
            setArtistSuggestions(artists.map((a) => a.name).slice(0, 8));
        }, 300);

        return () => {
            clearTimeout(handler);
        };
    }, [artistQuery, musicBrainzClient]);

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
                    <div
                        className="switcher"
                        style={{ "--switcher-target": "16rem" }}
                    >
                        <input
                            type="text"
                            name="artist"
                            list="artist-suggestions"
                            value={artistQuery}
                            onChange={(e) => setArtistQuery(e.target.value)}
                            style={{
                                touchAction: "manipulation",
                                borderTopRightRadius: datalistSupported
                                    ? "var(--r-2)"
                                    : "0",
                                borderBottomRightRadius: datalistSupported
                                    ? "var(--r-2)"
                                    : "0",
                            }}
                        />
                        {!datalistSupported && (
                            <select
                                value={artistQuery}
                                onChange={(e) => {
                                    setArtistQuery(e.target.value);
                                }}
                                style={{
                                    touchAction: "manipulation",
                                    borderTopLeftRadius: "0",
                                    borderBottomLeftRadius: "0",
                                }}
                            >
                                <option value="">
                                    {artistSuggestions.length > 0
                                        ? "Pick suggestion"
                                        : "Type to search"}
                                </option>
                                {artistSuggestions.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        )}
                        <datalist id="artist-suggestions">
                            {artistSuggestions.map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
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
