/**
 * Base application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Set the prototype explicitly
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture the stack trace, excluding the constructor call from it
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404);

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Unauthorized error
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized access") {
    super(message, 401);

    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/**
 * Forbidden error
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);

    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Bad request error
 */
export class BadRequestError extends AppError {
  constructor(message: string = "Bad request") {
    super(message, 400);

    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

/**
 * Validation error
 */
export class ValidationError extends AppError {
  public errors: Record<string, string[]>;

  constructor(
    message: string = "Validation error",
    errors: Record<string, string[]> = {}
  ) {
    super(message, 422);
    this.errors = errors;

    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Conflict error
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict") {
    super(message, 409);

    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends AppError {
  constructor(message: string = "Too many requests") {
    super(message, 429);

    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Service unavailable error
 */
export class ServiceUnavailableError extends AppError {
  constructor(message: string = "Service unavailable") {
    super(message, 503);

    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}
