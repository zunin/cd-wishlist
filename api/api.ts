import { OpenAPIHono } from "@hono/zod-openapi";
import { SwaggerUI } from "@hono/swagger-ui";

export default new OpenAPIHono().get('/', (c) => {
        return c.html(`
        <html lang="en">
            <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="description" content="Custom Swagger" />
            <title>CD wishlist</title>
            <style>
                /* custom style */
            </style>
            </head>
            ${SwaggerUI({ url: '/doc' })}
        </html>
        `)
    });
