import { OpenAPIHono } from "@hono/zod-openapi";
import Api from "./api.ts";
import AvailableAlbums from "./availableAlbums.ts";
import ReleaseGroup from "./releaseGroup.ts";

export default new OpenAPIHono()
    .route('/', Api)
    .route('/availableAlbums', AvailableAlbums)
    .route('/releaseGroup', ReleaseGroup);
