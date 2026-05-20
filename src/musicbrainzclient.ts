import { type IArtistMatch, MusicBrainzApi } from "musicbrainz-api";
import { compareSimilarity } from "@std/text";
import { type MusicbrainzMeta } from "./models/MusicbrainzMeta.ts";
import {
    MusicBrainzQueue,
    type QueueStatus,
} from "./utils/MusicBrainzQueue.ts";

export class MusicBrainzClient {
    private mbApi: MusicBrainzApi;
    private inFlightRequests = new Map<string, Promise<MusicbrainzMeta>>();
    private queue: MusicBrainzQueue;

    constructor() {
        this.mbApi = new MusicBrainzApi({
            appName: "cdwishlist",
            appVersion: "0.0.1",
            appContactInfo: "https://github.com/zunin/cd-wishlist",
        });

        // Initialize queue with max 2 concurrent requests to respect rate limits
        this.queue = new MusicBrainzQueue(2);
    }

    /**
     * Get the queue instance for status monitoring
     */
    getQueue(): MusicBrainzQueue {
        return this.queue;
    }

    /**
     * Subscribe to queue status changes
     */
    onQueueStatusChange(callback: (status: QueueStatus) => void): () => void {
        return this.queue.onStatusChange(callback);
    }

    getMusicBrainzHit(releaseGroupId: string): Promise<MusicbrainzMeta> {
        // Check if there's already an in-flight request for this ID
        if (this.inFlightRequests.has(releaseGroupId)) {
            return this.inFlightRequests.get(releaseGroupId)!;
        }

        // Create the promise and store it
        const promise = this.fetchMusicBrainzHit(releaseGroupId);
        this.inFlightRequests.set(releaseGroupId, promise);

        // Clean up when done
        promise.finally(() => {
            this.inFlightRequests.delete(releaseGroupId);
        });

        return promise;
    }

    private async fetchMusicBrainzHit(
        releaseGroupId: string,
    ): Promise<MusicbrainzMeta> {
        const url = `https://musicbrainz.org/ws/2/release-group/${releaseGroupId}?inc=artist-credits&fmt=json`;
        const response = await this.queue.enqueue(
            () =>
                fetch(url, {
                    headers: {
                        "User-Agent":
                            "cdwishlist/0.0.1 ( https://github.com/zunin/cd-wishlist )",
                    },
                }),
            {
                description: `Lookup: ${releaseGroupId}`,
                maxRetries: 5,
                priority: 0,
            },
        );
        if (!response.ok) {
            throw new Error(
                `MusicBrainz API error: ${response.status} ${response.statusText}`,
            );
        }
        const searchResult = await response.json();
        return {
            releaseGroupId,
            albumTitle: searchResult.title,
            artist:
                searchResult["artist-credit"]
                    ?.map((x: { artist: { name: string } }) => x.artist.name)
                    .join(", ") ?? "Unknown Artist",
            type: searchResult["primary-type"],
        } as MusicbrainzMeta;
    }

    async getMusicBrainzHits(
        artist: string,
        albumTitle: string,
        year?: number,
    ): Promise<MusicbrainzMeta[]> {
        const artists = await this.getArtists(artist);

        if (!albumTitle) {
            return await this.getReleaseGroupsForArtist(artists[0], year);
        }

        for (const artist of artists) {
            const hits = await this.queryArtistForReleaseGroup(
                albumTitle,
                artist,
                year,
            );
            if (hits !== null && hits.length > 0) {
                return hits;
            }
        }

        // Option 5: Artist-only fallback - if no album matches found, return artist's discography
        if (artists.length > 0) {
            console.log(
                `[MusicBrainz] No album matches for "${albumTitle}" by "${artist}", falling back to artist discography`,
            );
            return await this.getReleaseGroupsForArtist(artists[0], year);
        }

        return [];
    }

    private async queryArtistForReleaseGroup(
        albumTitle: string,
        artist: IArtistMatch,
        year?: number,
    ): Promise<MusicbrainzMeta[]> {
        // Try original title first, then progressively cleaner versions
        const titlesToTry = this.generateTitleVariations(albumTitle);

        for (let i = 0; i < titlesToTry.length; i++) {
            const title = titlesToTry[i];

            const hits = await this.searchReleaseGroup(
                title,
                artist,
                albumTitle,
                year,
            );
            if (hits.length > 0) {
                return hits;
            }
        }

        return [];
    }

    /**
     * Generate progressively cleaner variations of the album title
     * to improve match rate
     */
    private generateTitleVariations(originalTitle: string): string[] {
        const variations: string[] = [originalTitle];
        let currentTitle = originalTitle;

        // Strategy 1: Remove content in parentheses (Deluxe Edition, etc.)
        const parenPattern = /\s*\([^)]*\)\s*$/;
        if (parenPattern.test(currentTitle)) {
            currentTitle = currentTitle.replace(parenPattern, "").trim();
            variations.push(currentTitle);
        }

        // Strategy 2: Remove content after " - " (common separator for editions)
        const dashPattern = /\s+-\s+/;
        if (dashPattern.test(currentTitle)) {
            currentTitle = currentTitle.split(dashPattern)[0].trim();
            if (!variations.includes(currentTitle)) {
                variations.push(currentTitle);
            }
        }

        // Strategy 3: Remove content after "/" (e.g., "Album / Deluxe Version")
        const slashPattern = /\s*\/\s*/;
        if (slashPattern.test(currentTitle)) {
            currentTitle = currentTitle.split(slashPattern)[0].trim();
            if (!variations.includes(currentTitle)) {
                variations.push(currentTitle);
            }
        }

        // Strategy 4: Remove common suffixes without parentheses
        const commonSuffixes = [
            /\s+Deluxe\s*$/i,
            /\s+Special\s+Edition\s*$/i,
            /\s+Expanded\s+Edition\s*$/i,
            /\s+Remastered\s*$/i,
            /\s+Remaster\s*$/i,
            /\s+Anniversary\s+Edition\s*$/i,
            /\s+International\s+Version\s*$/i,
            /\s+UK\s+Edition\s*$/i,
            /\s+US\s+Edition\s*$/i,
            /\s+Version\s*$/i,
            /\s+Edit\s*$/i,
        ];

        for (const suffix of commonSuffixes) {
            if (suffix.test(currentTitle)) {
                const cleaned = currentTitle.replace(suffix, "").trim();
                if (cleaned !== currentTitle && !variations.includes(cleaned)) {
                    variations.push(cleaned);
                    currentTitle = cleaned;
                }
            }
        }

        return variations;
    }

    private async searchReleaseGroup(
        albumTitle: string,
        artist: IArtistMatch,
        originalTitle: string,
        year?: number,
    ): Promise<MusicbrainzMeta[]> {
        const artistQuery = [`artist:"${artist.name}"`].join(" OR ");

        const aliasArtistQuery = [
            ...new Set(
                artist.aliases?.map(
                    (alias) =>
                        `title:"${albumTitle
                            .toUpperCase()
                            .replaceAll(
                                alias.name.toUpperCase(),
                                artist.name.toUpperCase(),
                            )}"`,
                ) ?? [],
            ),
        ];

        const titleQuery = [
            ...new Set([`title:"${albumTitle}"`].concat(aliasArtistQuery)),
        ].join(" OR ");

        let query = `(${titleQuery}) AND (${artistQuery})`;
        if (
            !albumTitle.toLowerCase().includes("(single)") &&
            !albumTitle.toLowerCase().includes("(single cd)")
        ) {
            query += ` AND type:Album`;
        }

        // Add year filter if provided
        if (year) {
            query += ` AND date:${year}`;
        }

        try {
            // Use queue for search to handle rate limiting
            const releaseGroupSearchResult = await this.queue.enqueue(
                () => this.mbApi.search("release-group", { query }),
                {
                    description: `Search: "${albumTitle}" by "${artist.name}"`,
                    maxRetries: 5,
                    priority: 1,
                },
            );
            let sortedReleaseGroupSearchResult = releaseGroupSearchResult[
                "release-groups"
            ].sort((a, b) => {
                return (
                    b.score - a.score ||
                    compareSimilarity(originalTitle)(a.title, b.title)
                );
            });

            // If we have a year, prioritize releases that match that year
            if (year) {
                sortedReleaseGroupSearchResult =
                    sortedReleaseGroupSearchResult.sort((a, b) => {
                        const aYear = a["first-release-date"]
                            ? parseInt(a["first-release-date"].substring(0, 4))
                            : 0;
                        const bYear = b["first-release-date"]
                            ? parseInt(b["first-release-date"].substring(0, 4))
                            : 0;
                        const aDiff = Math.abs(aYear - year);
                        const bDiff = Math.abs(bYear - year);
                        return aDiff - bDiff;
                    });
            }

            const hits: MusicbrainzMeta[] = [];

            for (const searchResult of sortedReleaseGroupSearchResult) {
                hits.push({
                    releaseGroupId: searchResult.id,
                    albumTitle: [
                        "No Title",
                        "(No Title)",
                        "unknown",
                        "[unknown]",
                    ].some(
                        (ignoredTitle) => ignoredTitle === searchResult.title,
                    )
                        ? originalTitle
                        : searchResult.title,
                    artist:
                        searchResult["artist-credit"]
                            ?.map((x) => x.artist.name)
                            .join(", ") ?? "Unknown Artist",
                    type: searchResult["primary-type"],
                } as MusicbrainzMeta);
            }

            return hits;
        } catch (error) {
            console.error(`[MusicBrainz] Search error:`, error);
            return [];
        }
    }

    private async getReleaseGroupsForArtist(
        artist: IArtistMatch,
        year?: number,
    ): Promise<MusicbrainzMeta[]> {
        // Helper to execute a query and return sorted results
        const executeQuery = async (
            query: string,
            prioritizeYear?: number,
        ): Promise<MusicbrainzMeta[]> => {
            const result = await this.queue.enqueue(
                () => this.mbApi.search("release-group", { query }),
                {
                    description: `Get albums for artist: "${artist.name}"`,
                    maxRetries: 5,
                    priority: 1,
                },
            );
            let releaseGroups = result["release-groups"];

            if (prioritizeYear) {
                releaseGroups = releaseGroups.sort((a, b) => {
                    const aYear = a["first-release-date"]
                        ? parseInt(a["first-release-date"].substring(0, 4))
                        : 0;
                    const bYear = b["first-release-date"]
                        ? parseInt(b["first-release-date"].substring(0, 4))
                        : 0;
                    const aDiff = Math.abs(aYear - prioritizeYear);
                    const bDiff = Math.abs(bYear - prioritizeYear);
                    return aDiff - bDiff;
                });
            }

            return releaseGroups.map(
                (searchResult) =>
                    ({
                        releaseGroupId: searchResult.id,
                        albumTitle: searchResult.title,
                        artist:
                            searchResult["artist-credit"]
                                ?.map((x) => x.artist.name)
                                .join(", ") ?? "Unknown Artist",
                        type: searchResult["primary-type"],
                    }) as MusicbrainzMeta,
            );
        };

        try {
            // Strategy 1: Strict albums (no Live/Compilation/Demo/Remix) + year if provided
            let query = `artist:"${artist.name}" AND type:"Album" AND NOT type:"Live" AND NOT type:"Compilation" AND NOT type:"Demo" AND NOT type:"Remix"`;
            if (year) {
                query += ` AND date:${year}`;
            }
            let hits = await executeQuery(query, year);

            if (hits.length > 0) {
                return hits;
            }

            // Strategy 2: If no results with year, try WITHOUT year but still strict types
            if (year) {
                console.log(
                    `[MusicBrainz] No exact matches for "${artist.name}" in ${year}, trying without year constraint`,
                );
                const noYearQuery = `artist:"${artist.name}" AND type:"Album" AND NOT type:"Live" AND NOT type:"Compilation" AND NOT type:"Demo" AND NOT type:"Remix"`;
                hits = await executeQuery(noYearQuery);

                if (hits.length > 0) {
                    return hits;
                }
            }

            // Strategy 3: Try with Live/Compilation included but still with year if provided
            if (year) {
                console.log(
                    `[MusicBrainz] No strict album matches for "${artist.name}" in ${year}, trying with Live/Compilation fallbacks`,
                );
                const fallbackWithYearQuery = `artist:"${artist.name}" AND type:"Album" AND NOT type:"Demo" AND NOT type:"Remix" AND date:${year}`;
                hits = await executeQuery(fallbackWithYearQuery, year);

                if (hits.length > 0) {
                    return hits;
                }
            }

            // Strategy 4: Full fallback - Live/Compilation, no year restriction
            console.log(
                `[MusicBrainz] No results for "${artist.name}", trying full discography with Live/Compilation`,
            );
            const fullFallbackQuery = `artist:"${artist.name}" AND type:"Album" AND NOT type:"Demo" AND NOT type:"Remix"`;
            hits = await executeQuery(fullFallbackQuery, year);

            return hits;
        } catch {
            /* Empty */
        }
        return [];
    }

    async getArtists(cdArtist: string): Promise<IArtistMatch[]> {
        // Use queue for search to handle rate limiting
        const mbArtistSearchResult = await this.queue.enqueue(
            () =>
                this.mbApi.search("artist", {
                    query: cdArtist,
                    limit: 20,
                }),
            {
                description: `Search artist: "${cdArtist}"`,
                maxRetries: 5,
                priority: 2, // Higher priority than album searches
            },
        );
        const artists = mbArtistSearchResult["artists"] ?? [];

        return artists
            .map((a) => a.name)
            .sort(compareSimilarity(cdArtist))
            .map((name) => artists.filter((a) => a.name === name)[0]);
    }
}
