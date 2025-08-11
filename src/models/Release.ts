import { z } from 'zod'
import { MusicbrainzMetaSchema } from "./MusicbrainzMeta.ts";

export const ReleaseSchema = z.object({
  artist: z.string(),
  albumTitle: z.string(),
  price: z.string(),
  origin: z.string(),
  quality: z.string(),
  type: z.string(),
  musicbrainz: MusicbrainzMetaSchema.optional()
});

export type Release = z.infer<typeof ReleaseSchema>;
