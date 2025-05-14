import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";

import { MusicBrainzClient } from "../musicbrainzclient.ts";
import { MusicbrainzMetaSchema } from "../models/Release.ts";
import { AlbumArtistResultListComponent } from "../components/AlbumArtistResultList.tsx";

const route = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
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
          schema: MusicbrainzMetaSchema.array(),
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
  const { albumTitle, artist } = c.req.valid("query");
  if (!albumTitle || !artist) {
    if (c.req.header("Accept") === "application/json") {
      return c.json([]);
    }
    return c.html(``);
  }

  const hits = await musicBrainzClient.getMusicBrainzHits(artist, albumTitle);

  if (c.req.header("Accept") === "application/json") {
    return c.json(hits);
  }
  if (hits.length === 0) {
    return c.html(`<p>No results found for '<i>${artist} - ${albumTitle}</i>'</p>`)
  }

  return c.html(`${AlbumArtistResultListComponent(hits)}`);
});
