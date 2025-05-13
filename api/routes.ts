import { OpenAPIHono } from "@hono/zod-openapi";
import Api from "./api.ts";
import AvailableAlbums from "./availableAlbums.ts";

export default new OpenAPIHono()
    .route('/', Api)
    .route('/availableAlbums', AvailableAlbums);
