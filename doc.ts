import { OpenAPIHono } from "@hono/zod-openapi";

export default (app: OpenAPIHono) => app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "CD wishlist",
      contact: {
        name: "Nikolai Øllegaard",
        url: "https://github.com/zunin/cd-wishlist/"
      }
    },
  });
