import { z } from '@hono/zod-openapi'

export const MusicbrainzMetaSchema = z.object({
  releaseGroupId: z.string().optional(),
    artist: z.string().optional(),
    albumTitle: z.string().optional(),
    type: z.string().optional(),
});

export type MusicbrainzMeta = z.infer<typeof MusicbrainzMetaSchema>;
