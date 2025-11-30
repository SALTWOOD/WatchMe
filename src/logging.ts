import { createMiddleware } from "hono/factory";
import { Context, Next } from "hono";

// Normal.
export function requestLogger() {
    return createMiddleware(async (c: Context, next: Next) => {
        const start = Date.now()
        await next()
        const ms = Date.now() - start

        console.log(
            `${c.req.method} ${c.req.path} ${c.req.header('x-forwarded-proto') || 'http'} <${c.res.status}> - ${c.req.header('user-agent') || 'Unknown'} ${ms}ms`
        )
    })
}

// Colorful.
export function coloredRequestLogger() {
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
            `\x1b[${methodColor}m${method}\x1b[0m ${c.req.path} ${c.req.header('x-forwarded-proto') || 'http'} \x1b[${statusColor}m<${status}>\x1b[0m - ${c.req.header('user-agent') || 'Unknown'} \x1b[${ms > 1000 ? '31' : '32'}m${ms}ms\x1b[0m`
        )
    })
}