import { ReturnMessage } from "../types/return-message.js";
import { ServerData } from "../types/server-data.js";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { AppError } from "../types/app-error.js";
import { Battery, Device } from "../types/device.js";
import { ErrorType } from "../types/error-type.js";
import { DeviceStatus } from "../types/device-status.js";
import { Context } from "hono";
import { EntityManager, UpdateResult } from "typeorm";

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

async function updateHeartbeat(manager: EntityManager, id: number, isOnline: boolean = false): Promise<UpdateResult> {
    const now = new Date();
    return await manager.update(Device, id, {
        lastUpdatedAt: now,
        lastOnline: isOnline ? now : undefined
    });
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
        if (!body)
            throw AppError.quick(ErrorType.FIELD_NOT_FOUND);
        if (body.status === undefined)
            throw AppError.quick(ErrorType.FIELD_NOT_FOUND, "status")

        if (typeof body.status === "boolean")
            // if status is a boolean, convert it to online or offline
            body.status = body.status ? DeviceStatus.Online : DeviceStatus.Offline;
        else if (typeof body.status !== "number")
            throw AppError.quick(ErrorType.FIELD_TYPE_INVALID, "status")

        // Check ranges
        if (!DeviceStatus[body.status])
            throw AppError.quick(ErrorType.FIELD_OUT_OF_RANGE, "status");

        return quick(c, [
            await manager.update(Device, device.id, {
                status: body.status,
            }),
            await updateHeartbeat(
                manager,
                device.id,
                device.status === DeviceStatus.Online
            )
        ]);
    });

    base.get("/status", async (c) => {
        // avoid token leak
        const result = (await manager.find(Device))
            .map(({token, ...rest}) => rest)
            .sort((a, b) => a.id - b.id);
        return quick(c, result);
    });

    base.post("/heartbeat", async (c) => {
        const device = await tryGetDevice(c, manager);

        return quick(c, await updateHeartbeat(manager, device.id, device.status === DeviceStatus.Online));
    });

    base.post("/battery", async (c) => {
        const device = await tryGetDevice(c, manager);
        const body: { battery: Battery | null } = await c.req.json();

        return quick(c, [
            await manager.update(Device, device.id, {
                battery: {
                    power: body.battery?.power ?? 0,
                    charging: body.battery?.charging ?? false,
                }
            }),
            await updateHeartbeat(manager, device.id, device.status === DeviceStatus.Online)
        ]);
    });

    base.post("/message", async (c) => {
        const device = await tryGetDevice(c, manager);

        const body: { message: any } = await c.req.json();

        // Check types
        if (!body || body.message === undefined)
            throw AppError.quick(ErrorType.FIELD_NOT_FOUND, "message");

        if (typeof body.message !== "string")
            throw AppError.quick(ErrorType.FIELD_TYPE_INVALID, "message");

        return quick(c, [
            await manager.update(Device, device.id, {
                message: body.message
            }),
            await updateHeartbeat(
                manager,
                device.id,
                device.status === DeviceStatus.Online
            )
        ]);
    });
}