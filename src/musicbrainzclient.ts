import { type HttpClient, type IArtistMatch, MusicBrainzApi } from "musicbrainz-api";
import { compareSimilarity } from "@std/text";
import { delay } from "@std/async/delay";
import { type MusicbrainzMeta } from "./models/MusicbrainzMeta.ts";

export class MusicBrainzClient {
  private mbApi: MusicBrainzApi;

  constructor() {
    this.mbApi = new MusicBrainzApi({
      appName: "cdwishlist",
      appVersion: "0.0.1",
      appContactInfo: "https://github.com/zunin/cd-wishlist",
    });
    const client = ((this.mbApi as unknown as MusicBrainzApi & {httpClient: HttpClient}).httpClient);
    (this.mbApi as unknown as {httpClient: HttpClient}).httpClient = client;;
  }

  async getMusicBrainzHit(
    releaseGroupId: string,
  ): Promise<MusicbrainzMeta> {
    const searchResult = await this.mbApi.lookup("release-group", releaseGroupId, ["artist-credits"]);
    return {
      releaseGroupId,
      albumTitle: searchResult.title,
      artist: searchResult["artist-credit"]
        .map((x) => x.artist.name)
        .join(
          ", ",
        ),
      type: searchResult["primary-type"],
    } as MusicbrainzMeta;
  }

  async getMusicBrainzHits(
    artist: string,
    albumTitle: string,
    year?: number
  ): Promise<MusicbrainzMeta[]> {
    const artists = await this.getArtists(artist);

    if (!albumTitle) {
        return await this.getReleaseGroupsForArtist(artists[0], year);
    }

    for (const artist of artists) {
      const hits = await this.queryArtistForReleaseGroup(albumTitle, artist, year);
      if (hits !== null && hits.length > 0) {
        return hits;
      }
    }

    // Option 5: Artist-only fallback - if no album matches found, return artist's discography
    if (artists.length > 0) {
      console.log(`[MusicBrainz] No album matches for "${albumTitle}" by "${artist}", falling back to artist discography`);
      return await this.getReleaseGroupsForArtist(artists[0], year);
    }

    return [];
  }

  private async queryArtistForReleaseGroup(
    albumTitle: string,
    artist: IArtistMatch,
    year?: number
  ): Promise<MusicbrainzMeta[]> {
    // Try original title first, then progressively cleaner versions
    const titlesToTry = this.generateTitleVariations(albumTitle);
    
    for (let i = 0; i < titlesToTry.length; i++) {
      const title = titlesToTry[i];
      
      // Rate limit between retries
      if (i > 0) {
        await delay(200);
      }

      const hits = await this.searchReleaseGroup(title, artist, albumTitle, year);
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
      currentTitle = currentTitle.replace(parenPattern, '').trim();
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
        const cleaned = currentTitle.replace(suffix, '').trim();
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
    year?: number
  ): Promise<MusicbrainzMeta[]> {
    const artistQuery = [`artist:"${artist.name}"`]
      .join(" OR ");

    const aliasArtistQuery = [
      ...new Set(
        artist.aliases?.map((alias) =>
          `title:"${
            albumTitle.toUpperCase().replaceAll(
              alias.name.toUpperCase(),
              artist.name.toUpperCase(),
            )
          }"`
        ) ?? [],
      ),
    ];

    const titleQuery = [
      ...new Set([`title:"${albumTitle}"`]
        .concat(aliasArtistQuery)),
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
      const releaseGroupSearchResult = await this.mbApi.search(
        "release-group",
        { query },
      );
      let sortedReleaseGroupSearchResult =
        releaseGroupSearchResult["release-groups"].sort((a, b) => {
          return b.score - a.score ||
            compareSimilarity(originalTitle)(a.title, b.title);
        });

      // If we have a year, prioritize releases that match that year
      if (year) {
        sortedReleaseGroupSearchResult = sortedReleaseGroupSearchResult.sort((a, b) => {
          const aYear = a['first-release-date'] ? parseInt(a['first-release-date'].substring(0, 4)) : 0;
          const bYear = b['first-release-date'] ? parseInt(b['first-release-date'].substring(0, 4)) : 0;
          const aDiff = Math.abs(aYear - year);
          const bDiff = Math.abs(bYear - year);
          return aDiff - bDiff;
        });
      }

      const hits: MusicbrainzMeta[] = [];

      for (const searchResult of sortedReleaseGroupSearchResult) {
        hits.push({
            releaseGroupId: searchResult.id,
            albumTitle: ["No Title", "(No Title)", "unknown", "[unknown]"]
                .some((ignoredTitle) => ignoredTitle === searchResult.title)
              ? originalTitle
              : searchResult.title,
            artist: searchResult["artist-credit"].map((x) => x.artist.name)
              .join(
                ", ",
              ),
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
    year?: number
  ): Promise<MusicbrainzMeta[]> {
    let query = `artist:"${artist.name}" AND type:"Album" AND NOT type:"Live" and NOT type:"Compilation" and NOT type:"Demo" and NOT type:"Remix"`;
    
    // Add year filter if provided
    if (year) {
      query += ` AND date:${year}`;
    }
    
    try {
      const releaseGroupSearchResult = await this.mbApi.search(
        "release-group",
        { query },
      );
      let sortedReleaseGroupSearchResult =
        releaseGroupSearchResult["release-groups"];

      // If we have a year, prioritize releases that match that year
      if (year) {
        sortedReleaseGroupSearchResult = sortedReleaseGroupSearchResult.sort((a, b) => {
          const aYear = a['first-release-date'] ? parseInt(a['first-release-date'].substring(0, 4)) : 0;
          const bYear = b['first-release-date'] ? parseInt(b['first-release-date'].substring(0, 4)) : 0;
          const aDiff = Math.abs(aYear - year);
          const bDiff = Math.abs(bYear - year);
          return aDiff - bDiff;
        });
      }

      const hits: MusicbrainzMeta[] = [];
      for (const searchResult of sortedReleaseGroupSearchResult) {
        hits.push({
            releaseGroupId: searchResult.id,
            albumTitle: searchResult.title,
            artist: searchResult["artist-credit"].map((x) => x.artist.name)
              .join(", "),
            type: searchResult["primary-type"],
          } as MusicbrainzMeta);
      }
      if (hits.length > 0) {
        return hits;
      }
    } catch { /* Empty */ }
    return [];
  }

  private async getArtists(cdArtist: string): Promise<IArtistMatch[]> {
    const mbArtistSearchResult = await this.mbApi.search("artist", {
      query: cdArtist,
      limit: 20,
    });
    const artists = mbArtistSearchResult["artists"] ?? [];

    return artists.map((a) => a.name).sort(
      compareSimilarity(cdArtist),
    ).map((name) => artists.filter((a) => a.name === name)[0]);
  }
}


