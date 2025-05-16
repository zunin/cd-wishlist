import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { z } from "@hono/zod-openapi";

import { MusicBrainzClient } from "../musicbrainzclient.ts";
import { Release, ReleaseSchema } from "../models/Release.ts";
import { AlbumArtistResultListComponent } from "../components/AlbumArtistResultList.tsx";
import { MusicbrainzMeta, MusicbrainzMetaSchema } from "../models/MusicbrainzMeta.ts";

const route = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      id: z.string().array().or(z.string())
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            musicBrainz: MusicbrainzMetaSchema,
            available: ReleaseSchema.array()
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
  const { id: idInput } = c.req.valid("query");
  const ids = typeof idInput === "string" ? [idInput] : idInput;

  console.log("ids", ids)

  if (!ids || ids.length === 0) {
    if (c.req.header("Accept") === "application/json") {
      return c.json([]);
    }
    return c.html(`Write something in artist and album title to search`);
  }

  
  const cd6000 =
          await (await fetch(
              "https://raw.githubusercontent.com/zunin/rytmeboxen.dk-history/main/cds.json",
          )).json() as Release[];
  const rytmeboxen =
      await (await fetch(
          "https://raw.githubusercontent.com/zunin/cd6000.dk-history/main/cds.json",
      )).json() as Release[];
  
  const availableReleases = cd6000.concat(rytmeboxen);

  
  const musicBrainzHits = []
  for (const id of ids) {
    musicBrainzHits.push(await musicBrainzClient.getMusicBrainzHit(id));
  }
  const hits = musicBrainzHits.map(musicBrainz => {
    return {
        musicBrainz,
        available: availableReleases.filter(release => release.musicbrainz?.releaseGroupId === musicBrainz.releaseGroupId)
    } as {musicBrainz: MusicbrainzMeta, available: Release[]}
  })
  
  if (c.req.header("Accept") === "application/json") {
    return c.json(hits);
  }
  if (hits.length === 0) {
    return c.html(`<p>No releases saved to wishlist</p>`)
  }

  return c.html(`${AlbumArtistResultListComponent(ids, hits)}`);
});
