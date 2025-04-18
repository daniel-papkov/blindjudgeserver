import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { logger } from "../utils/logger";

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error for debugging
  logger.error(`Error: ${err.message}`, {
    url: req.url,
    method: req.method,
    stack: err.stack,
  });

  // Check if it's our custom AppError
  if (err instanceof AppError) {
    // Send structured error response
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      // If it's a validation error with field-specific errors, include them
      ...("errors" in err ? { errors: err.errors } : {}),
    });
    return;
  }

  // For unexpected errors
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal Server Error"
      : err.message || "Something went wrong";

  res.status(statusCode).json({
    success: false,
    message,
    // Only include stack trace in development
    ...(process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}),
  });
};

/**
 * Catch unhandled route middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.url}`,
  });
};

/**
 * Catch async errors in route handlers
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
