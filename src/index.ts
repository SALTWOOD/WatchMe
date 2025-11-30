import { Hono } from "hono";
import { Config } from "./config.js";
import { serve, ServerType } from "@hono/node-server";
import { createServer as createHttpsServer } from "node:https";
import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { DataSource } from "typeorm";
import { Device } from "./types/device.js";
import { initRoutes } from "./http/routes.js";
import { cors } from "hono/cors";
import { requestLogger, coloredRequestLogger } from "./logging.js";

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

app.use("*", cors(JSON.parse(Config.instance.server.cors)));
if (Config.instance.logging.enabled) {
    app.use(Config.instance.logging.colorful ? coloredRequestLogger() : requestLogger());
}

initRoutes({
    hono: app,
    db
});

let server: ServerType;

function stop() {
    server.close();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

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
