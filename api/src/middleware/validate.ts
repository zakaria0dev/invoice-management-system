import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Reusable validation middleware using Zod.
 * Enforces strict typing and structure for body, query, and params.
 * Prevents processing of malformed data and aids in preventing injection attacks.
 */
export const validate = (schema: any) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsed = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            req.body = parsed.body || req.body;
            req.query = parsed.query || req.query;
            req.params = parsed.params || req.params;
            next();
        } catch (error: any) {
            if (error && error.errors) {
                return res.status(400).json({
                    status: 'error',
                    message: error.errors[0]?.message,
                    errors: error.errors,
                });
            }
            next(error);
        }
    };
};
