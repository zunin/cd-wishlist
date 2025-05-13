import { z } from '@hono/zod-openapi'

export const MusicbrainzMeta = z.object({
  releaseGroupId: z.string().optional(),
    artist: z.string().optional(),
    albumTitle: z.string().optional(),
    type: z.string().optional(),
});

export const Release = z.object({
  artist: z.string(),
  albumTitle: z.string(),
  price: z.string(),
  origin: z.string(),
  quality: z.string(),
  type: z.string(),
  musicbrainz: MusicbrainzMeta.optional()
}).openapi("Release");

export type Release = z.infer<typeof Release>;