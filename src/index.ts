import { Context, Hono, Next } from "hono";
import { Config } from "./config.js";
import { serve } from "@hono/node-server";
import { createServer as createHttpsServer } from "node:https";
import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { DataSource } from "typeorm";
import { Device } from "./types/device.js";
import { initRoutes } from "./http/routes.js";
import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";

// Normal.
function requestLogger() {
    return createMiddleware(async (c: Context, next: Next) => {
        const start = Date.now()
        await next()
        const ms = Date.now() - start

        console.log(
            `${c.req.method} ${c.req.url} ${c.req.header('x-forwarded-proto') || 'http'} <${c.res.status}> - ${c.req.header('user-agent') || 'Unknown'} ${ms}ms`
        )
    })
}

// Colorful.
function coloredRequestLogger() {
    return createMiddleware(async (c: Context, next: Next) => {
        const start = Date.now()
        await next()
        const ms = Date.now() - start

        const method = c.req.method
        const status = c.res.status
        const methodColor =
            method === 'GET' ? '32' :
                method === 'POST' ? '33' :
                    method === 'PUT' ? '34' :
                        method === 'DELETE' ? '31' : '36'
        const statusColor = status >= 500 ? '31' : status >= 400 ? '33' : status >= 300 ? '36' : '32'

        console.log(
            `\x1b[${methodColor}m${method}\x1b[0m ${c.req.url} ${c.req.header('x-forwarded-proto') || 'http'} \x1b[${statusColor}m<${status}>\x1b[0m - ${c.req.header('user-agent') || 'Unknown'} \x1b[${ms > 1000 ? '31' : '32'}m${ms}ms\x1b[0m`
        )
    })
}

const app = new Hono();

// 初始化服务器
const serveOptions = {
    fetch: app.fetch,
    port: Config.instance.server.port,
    hostname: Config.instance.server.host
};

const db = new DataSource({
    type: Config.instance.database.type as any,
    host: Config.instance.database.host,
    port: Config.instance.database.port,
    username: Config.instance.database.username,
    password: Config.instance.database.password,
    database: Config.instance.database.database,
    entities: [Device],
    synchronize: Config.instance.database.synchronize
});

await db.initialize();

app.use(cors(JSON.parse(Config.instance.server.cors)));
if (Config.instance.logging.enabled) {
    app.use(Config.instance.logging.colorful ? coloredRequestLogger() : requestLogger());
}

initRoutes({
    hono: app,
    db
});

let server;
// 是否启用 SSL
if (Config.instance.server.ssl.enabled) {
    server = serve({
        ...serveOptions,
        createServer: createHttpsServer,
        serverOptions: {
            key: await readFile(Config.instance.server.ssl.key),
            cert: await readFile(Config.instance.server.ssl.cert)
        }
    });
} else {
    server = serve({
        ...serveOptions,
        createServer: createHttpServer,
    });
}