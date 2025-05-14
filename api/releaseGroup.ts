import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { MusicbrainzMetaSchema, MusicbrainzMeta, Release, ReleaseSchema } from "../models/Release.ts";
import { z } from "@hono/zod-openapi";
import { AlbumArtistResultListComponent } from "../index.tsx";
import { MusicBrainzClient } from "../musicbrainzclient.ts";

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
  const hits = await musicBrainzClient.getMusicBrainzHits(albumTitle, artist);

  if (c.req.header("Accept") === "application/json") {
    return c.json(hits);
  }
  
  return c.html(`${AlbumArtistResultListComponent(hits)}`)

});
