import { IArtistMatch, MusicBrainzApi } from "musicbrainz-api";
import { compareSimilarity } from "jsr:@std/text";
import { delay } from "@std/async/delay";
import { release } from "node:os";
import { MusicbrainzMeta } from "./models/Release.ts";

export class MusicBrainzClient {
  private mbApi: MusicBrainzApi;

  constructor() {
    this.mbApi = new MusicBrainzApi({
      appName: "cdwishlist",
      appVersion: "0.0.1",
      appContactInfo: "https://github.com/zunin/cd-wishlist",
    });
  }

  async getMusicBrainzHits(
    artist: string,
    albumTitle: string
  ): Promise<MusicbrainzMeta[]> {
    const artists = await this.getArtists(artist);

    for (const artist of artists) {
      const hits = await this.queryArtistForReleaseGroup(albumTitle, artist);
      if (hits !== null) {
        return hits;
      }
    }
    return [];
  }

  private async queryArtistForReleaseGroup(
    albumTitle: string,
    artist: IArtistMatch
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

    try {
      const releaseGroupSearchResult = await this.mbApi.search(
        "release-group",
        { query },
      );
      const sortedReleaseGroupSearchResult =
        releaseGroupSearchResult["release-groups"].sort((a, b) => {
          return b.score - a.score ||
            compareSimilarity(albumTitle)(a.title, b.title);
        });

      const hits = []

      for (const searchResult of  sortedReleaseGroupSearchResult) {
        hits.push({
            releaseGroupId: searchResult.id,
            albumTitle: ["No Title", "(No Title)", "unknown", "[unknown]"]
                .some((ignoredTitle) => ignoredTitle === searchResult.title)
              ? albumTitle
              : searchResult.title,
            artist: searchResult["artist-credit"].map((x) => x.artist.name)
              .join(
                ", ",
              ),
            type: searchResult["primary-type"],
          } as MusicbrainzMeta);
      }
      if (hits.length > 0) {
        return hits;
      } else {
        const titleCleaningStrategies: Array<TitleCleaningStrategy> = [
          new CDParenthesisCleaningStrategy(),
          new ParanthesisEndCleaningStrategy(),
        ];
        const cleanedTitle = titleCleaningStrategies.reduce(
          (text, strategy) => {
            if (strategy.canClean(text)) {
              return strategy.clean(text);
            }
            return text;
          },
          albumTitle,
        );

        if (cleanedTitle !== albumTitle) {
          await delay(200);
          return await this.queryArtistForReleaseGroup(
            cleanedTitle,
            artist
          );
        }
      }
    } catch (_) { /* Empty */ }
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

interface TitleCleaningStrategy {
  canClean(title: string): boolean;
  clean(title: string): string;
}

class ParanthesisEndCleaningStrategy implements TitleCleaningStrategy {
  private regex = /\(.*\)$/g;

  canClean(title: string): boolean {
    const match = title.match(this.regex);

    return match !== null && match.length > 0;
  }
  clean(title: string): string {
    return title.replaceAll(this.regex, "");
  }
}

class CDParenthesisCleaningStrategy implements TitleCleaningStrategy {
  private regex = /\(\d?CD.*\)/gi;

  canClean(title: string): boolean {
    const match = title.match(this.regex);

    return match !== null && match.length > 0;
  }
  clean(title: string): string {
    return title.replaceAll(this.regex, "");
  }
}
