import {  OpenAPIHono } from "@hono/zod-openapi";
import OASUI from "./doc.ts"
import API from "./api/routes.ts"
import index from "./index.tsx";
import { html } from "hono/html";

const app = new OpenAPIHono();


app.route("/", OASUI(app));
app.route("/api", API);
app.get('/', (c) => c.html(html`<!DOCTYPE html>${index}`))

Deno.serve({ port: 80 }, app.fetch);
