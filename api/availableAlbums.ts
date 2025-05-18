import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { Release, ReleaseSchema } from "../models/Release.ts";
import { z } from "@hono/zod-openapi";
import ReleaseHistoryRepository from "../releaseHistoryRepository.ts"

const route = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: ReleaseSchema.array(),
        },
        "text/html": {
          schema: z.string(),
        },
      },
      description: "Retrieve available albums",
    },
  },
});

export default new OpenAPIHono().openapi(route, async (c) => {
  const availableReleases = await ReleaseHistoryRepository.get();

  return c.json(
    availableReleases.filter((r) => r.musicbrainz),
    200, // You should specify the status code even if it is 200.
  );
});
