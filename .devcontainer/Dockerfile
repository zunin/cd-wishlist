FROM denoland/deno:bin-1.45.5 AS deno
FROM mcr.microsoft.com/devcontainers/typescript-node:20
COPY --from=deno /deno /usr/local/bin/deno
