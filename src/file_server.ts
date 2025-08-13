import { parseArgs } from "https://deno.land/std@0.217.0/cli/parse_args.ts";
import { serveDir } from "https://deno.land/std@0.217.0/http/file_server.ts";
import { VERSION } from "https://deno.land/std@0.217.0/version.ts";

import { resolve } from "https://deno.land/std@0.217.0/path/resolve.ts";

function main() {
  const serverArgs = parseArgs(Deno.args, {
    string: ["port", "host", "cert", "key", "header"],
    boolean: ["help", "dir-listing", "dotfiles", "cors", "verbose", "version"],
    negatable: ["dir-listing", "dotfiles", "cors"],
    collect: ["header"],
    default: {
      "dir-listing": true,
      dotfiles: true,
      cors: true,
      verbose: false,
      version: false,
      host: "0.0.0.0",
      port: "4507",
      cert: "",
      key: "",
    },
    alias: {
      p: "port",
      c: "cert",
      k: "key",
      h: "help",
      v: "verbose",
      V: "version",
      H: "header",
    },
  });
  const port = Number(serverArgs.port);
  const headers = serverArgs.header || [];
  const host = serverArgs.host;
 
  const wild = serverArgs._ as string[];
  const target = resolve(wild[0] ?? "");

  const handler = (req: Request): Promise<Response> => {
    return serveDir(req, {
      fsRoot: target,
      showDirListing: serverArgs["dir-listing"],
      showDotfiles: serverArgs.dotfiles,
      enableCors: false,
      quiet: !serverArgs.verbose,
      headers,
    });
  };

  Deno.serve({
      port,
      hostname: host,
    }, handler);
}

if (import.meta.main) {
  main();
}
