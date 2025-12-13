import { StatusCode } from "hono/utils/http-status";
import { ErrorType } from "./error-type.js";

export class AppError extends Error {
    public statusCode: StatusCode;
    public data: any;

    constructor(message: string, statusCode: StatusCode = 500, data: any = null) {
        super(message);
        this.statusCode = statusCode;
        this.data = data;
    }

    public static quick(type: ErrorType, data: any = null) {
        switch (type) {
            case ErrorType.FIELD_NOT_FOUND:
                return new this(`Bad request: missing "${data}" field`, 400);
            case ErrorType.FIELD_TYPE_INVALID:
                if (!data)
                    return new AppError("Bad request: invalid body", 400);
                return new this(`Bad request: invalid type for "${data}"`, 400);
            case ErrorType.FIELD_OUT_OF_RANGE:
                return new this(`Bad request: "${data}" out of range`, 400);
            case ErrorType.UNAUTHORIZED:
                const message = data ? `Unauthorized: ${data}` : "Unauthorized";
                return new this(message);
        }
    }
}