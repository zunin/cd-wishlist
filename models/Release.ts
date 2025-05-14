import { z } from '@hono/zod-openapi'

export const MusicbrainzMetaSchema = z.object({
  releaseGroupId: z.string().optional(),
    artist: z.string().optional(),
    albumTitle: z.string().optional(),
    type: z.string().optional(),
});
export type MusicbrainzMeta = z.infer<typeof MusicbrainzMetaSchema>;

export const ReleaseSchema = z.object({
  artist: z.string(),
  albumTitle: z.string(),
  price: z.string(),
  origin: z.string(),
  quality: z.string(),
  type: z.string(),
  musicbrainz: MusicbrainzMetaSchema.optional()
}).openapi("Release");

export type Release = z.infer<typeof ReleaseSchema>;