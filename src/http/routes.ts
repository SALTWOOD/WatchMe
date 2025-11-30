import { ReturnMessage } from "../types/return-message.js";
import { ServerData } from "../types/server-data.js";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../types/app-error.js";
import { Device } from "../types/device.js";
import { ErrorType } from "../types/error-type.js";
import { DeviceStatus } from "../types/device-status.js";
import { Context } from "hono";
import { EntityManager } from "typeorm";

const quick = (c: Context, data: any = null, code: ContentfulStatusCode = 200, message = ReturnMessage.SUCCESS) =>
    c.json({message, code, data, error: null}, code);

async function tryGetDevice(c: Context, manager: EntityManager): Promise<Device> {
    const token = c.req.query("token");
    if (!token)
        throw AppError.quick(ErrorType.UNAUTHORIZED);

    const device = await manager.findOne(Device, {
        where: {token}
    });

    if (!device) throw new AppError("Unable to find device", 404);

    return device;
}

export function initRoutes(config: ServerData) {
    const app = config.hono;
    const db = config.db;
    const manager = db.manager;

    // 当处理程序抛出错误时返回 JSON 响应
    app.onError((error, c) => {
        const isAppError = error instanceof AppError;
        const statusCode = isAppError ? error.statusCode : 500;
        const data = isAppError ? error.data : null;

        if ([101, 204, 205, 304].includes(statusCode)) {
            return c.body(null, statusCode);
        }

        return c.json({
            message: ReturnMessage.ERROR,
            data,
            error: {
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
        }, statusCode as ContentfulStatusCode); // 上面排除了 ContentlessStatusCode，所以直接 as
    });

    const base = app.basePath("/api/v1");

    base.post("/status", async (c) => {
        const device = await tryGetDevice(c, manager);

        const body: { status: any } = await c.req.json();

        // Check types
        if (!body || body.status === undefined)
            throw AppError.quick(ErrorType.FIELD_NOT_FOUND, "status")

        if (typeof body.status === "boolean")
            // if status is a boolean, convert it to online or offline
            body.status = body.status ? DeviceStatus.Online : DeviceStatus.Offline;
        else if (typeof body.status !== "number")
            throw AppError.quick(ErrorType.FIELD_TYPE_INVALID, "status")

        // Check ranges
        if (!DeviceStatus[body.status])
            throw AppError.quick(ErrorType.FIELD_OUT_OF_RANGE, "status");

        const result = await manager.update(Device, device.id, {
            lastUpdatedAt: new Date(),
            status: body.status,
        });
        return quick(c, result);
    });

    base.post("/heartbeat", async (c) => {
        const device = await tryGetDevice(c, manager);

        const result = await manager.update(Device, device.id, {
            lastUpdatedAt: new Date(),
        });
        return quick(c, result);
    });

    base.post("/message", async (c) => {
        const device = await tryGetDevice(c, manager);

        const body: { message: any } = await c.req.json();

        // Check types
        if (!body || body.message === undefined)
            throw AppError.quick(ErrorType.FIELD_NOT_FOUND, "message");

        if (typeof body.message !== "string")
            throw AppError.quick(ErrorType.FIELD_TYPE_INVALID, "message");

        const result = await manager.update(Device, device.id, {
            lastUpdatedAt: new Date(),
            message: body.message,
        });
        return quick(c, result);
    });

    base.get("/status", async (c) => {
        const result = await manager.find(Device);
        return quick(c, result);
    });
}