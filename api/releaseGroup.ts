import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";

import { MusicBrainzClient } from "../musicbrainzclient.ts";
import { Release, ReleaseSchema } from "../models/Release.ts";
import { AlbumArtistResultListComponent } from "../components/AlbumArtistResultList.tsx";
import {
  MusicbrainzMeta,
  MusicbrainzMetaSchema,
} from "../models/MusicbrainzMeta.ts";
import ReleaseHistoryRepository from "../releaseHistoryRepository.ts";

const route = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      id: z.string().array().or(z.string()),
      artist: z.string()
        .openapi({
          param: {
            name: "artist",
            in: "query",
          },
          example: "ABBA",
        }),
      albumTitle: z.string()
        .openapi({
          param: {
            name: "albumTitle",
            in: "query",
          },
          example: "Gold",
        }),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            musicBrainz: MusicbrainzMetaSchema,
            available: ReleaseSchema.array(),
          }).array(),
          example: [{
            "releaseGroupId": "dd205538-ecdb-446b-ae83-8a1c2e48c022",
            "albumTitle": "The Real Abba Gold",
            "artist": "The Real ABBA Gold",
            "type": "Album",
          }],
        },
        "text/html": {
          schema: z.string(),
        },
      },
      description: "Search for releases on musicbrainz",
    },
  },
});

const musicBrainzClient = new MusicBrainzClient();

export default new OpenAPIHono().openapi(route, async (c) => {
  const { albumTitle, artist, id: idInput } = c.req.valid("query");
  const ids = typeof idInput === "string" ? [idInput] : idInput;

  if (!artist) {
    if (c.req.header("Accept") === "application/json") {
      return c.json([]);
    }
    return c.html(`Write something in artist and album title to search`);
  }

  const availableReleases = await ReleaseHistoryRepository.get();

  const musicBrainzHits = await musicBrainzClient.getMusicBrainzHits(
    artist,
    albumTitle,
  );
  const hits = musicBrainzHits.map((musicBrainz) => {
    return {
      musicBrainz,
      available: availableReleases.filter((release) =>
        release.musicbrainz?.releaseGroupId === musicBrainz.releaseGroupId
      ),
    } as { musicBrainz: MusicbrainzMeta; available: Release[] };
  });

  if (c.req.header("Accept") === "application/json") {
    return c.json(hits);
  }
  if (hits.length === 0) {
    return c.html(
      `<p>No results found for '<i>${artist} - ${albumTitle}</i>'</p>`,
    );
  }

  return c.html(`${AlbumArtistResultListComponent(ids, hits)}`);
});
