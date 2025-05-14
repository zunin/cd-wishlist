import { z } from '@hono/zod-openapi'
import { MusicbrainzMetaSchema } from "./MusicbrainzMeta.ts";

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
