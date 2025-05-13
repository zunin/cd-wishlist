import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { Release } from "../models/Release.ts";
import { z } from '@hono/zod-openapi'
import { AlbumArtistSearchCompoennt } from "../index.tsx";

const route = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: Release.array(),
        },
        "text/html": {
          schema: z.string()
        }
      },
      description: "Retrieve available albums",
    },
  },
});

export default new OpenAPIHono().openapi(route, async (c) => {
  if (c.req.header('accept') === "text/html") {
    return c.html(`${AlbumArtistSearchCompoennt}`);
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

  return c.json(
    availableReleases.filter(r => r.musicbrainz),
    200, // You should specify the status code even if it is 200.
  );
});
