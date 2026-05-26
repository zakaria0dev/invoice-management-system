import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    statusCode: number;
    businessCode?: string;
    isOperational: boolean;

    constructor(message: string, statusCode: number, businessCode?: string) {
        super(message);
        this.statusCode = statusCode;
        this.businessCode = businessCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Handle Zod Errors
    if (err.name === 'ZodError' || (err.errors && Array.isArray(err.errors))) {
        err.statusCode = 400;
        err.status = 'fail';
        const rawMessage = Array.isArray(err.errors) ? err.errors[0]?.message : err.message;

        // If it looks like a Zod JSON string, parse it
        if (typeof rawMessage === 'string' && rawMessage.startsWith('[')) {
            try {
                const parsed = JSON.parse(rawMessage);
                err.message = parsed[0]?.message || parsed[0]?.Message || rawMessage;
            } catch (e) {
                err.message = rawMessage;
            }
        } else {
            err.message = rawMessage;
        }
    }

    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            businessCode: err.businessCode,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    } else {
        // Production
        if (err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                businessCode: err.businessCode,
                message: err.message,
            });
        } else {
            console.error('ERROR 💥', err);
            res.status(500).json({
                status: 'error',
                message: 'Something went very wrong!',
            });
        }
    }
};
