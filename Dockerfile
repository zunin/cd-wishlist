FROM denoland/deno:latest

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY deno.json deno.lock ./
COPY package.json ./

RUN deno cache --node-modules-dir=auto npm:vite && \
    deno cache --node-modules-dir=auto npm:@vitejs/plugin-react && \
    deno cache --node-modules-dir=auto npm:vite-plugin-pwa && \
    deno cache --node-modules-dir=auto npm:vite-plugin-sw && \
    deno cache --node-modules-dir=auto npm:eslint

COPY . .

EXPOSE 5173

CMD ["deno", "run", "-A", "npm:vite", "--host", "0.0.0.0"]