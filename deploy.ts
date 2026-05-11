/**
 * Deno Deploy entrypoint for the CD Wishlist frontend.
 *
 * Serves the built static assets from the dist/ directory.
 */
import { serveDir } from "jsr:@std/http@1/file-server";

const handler = (req: Request): Response | Promise<Response> => {
  return serveDir(req, {
    fsRoot: "dist",
    showDirListing: false,
    showDotfiles: false,
    enableCors: true,
    quiet: true,
  });
};

Deno.serve(handler);
