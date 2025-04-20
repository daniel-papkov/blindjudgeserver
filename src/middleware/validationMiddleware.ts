import { Request, Response, NextFunction } from "express";
import { Validator } from "../utils/validator";
import { ValidationError } from "../errors/AppError";

/**
 * Create a validation middleware for request body
 */
export const validateBody = (validationFn: (validator: Validator) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validator = new Validator(req.body);
      validationFn(validator);

      if (validator.hasErrors()) {
        throw new ValidationError("Validation failed", validator.getErrors());
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Create a validation middleware for request params
 */
export const validateParams = (
  validationFn: (validator: Validator) => void
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validator = new Validator(req.params);
      validationFn(validator);

      if (validator.hasErrors()) {
        throw new ValidationError("Validation failed", validator.getErrors());
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Create a validation middleware for request query
 */
export const validateQuery = (validationFn: (validator: Validator) => void) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validator = new Validator(req.query as Record<string, any>);
      validationFn(validator);

      if (validator.hasErrors()) {
        throw new ValidationError("Validation failed", validator.getErrors());
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Room validation middleware functions
 */
export const roomValidators = {
  createRoom: validateBody((validator) => {
    validator
      .required("guidingQuestion", "A guiding question is required")
      .minLength(
        "guidingQuestion",
        10,
        "Guiding question must be at least 10 characters"
      )
      .maxLength(
        "guidingQuestion",
        500,
        "Guiding question cannot exceed 500 characters"
      )
      .required("password", "Password is required")
      .minLength("password", 4, "Password must be at least 4 characters");
  }),

  joinRoom: validateBody((validator) => {
    validator.required("password", "Password is required");
  }),

  roomIdParam: validateParams((validator) => {
    validator.required("roomId", "Room ID is required");
  }),

  sendMessage: validateBody((validator) => {
    validator
      .required("message", "Message cannot be empty")
      .maxLength("message", 2000, "Message cannot exceed 2000 characters");
  }),

  submitConclusion: validateBody((validator) => {
    validator
      .required("conclusion", "Conclusion is required")
      .minLength("conclusion", 10, "Conclusion must be at least 10 characters")
      .maxLength(
        "conclusion",
        5000,
        "Conclusion cannot exceed 5000 characters"
      );
  }),
};

/**
 * Auth validation middleware functions
 */
export const authValidators = {
  register: validateBody((validator) => {
    validator
      .required("username", "Username is required")
      .minLength("username", 3, "Username must be at least 3 characters")
      .maxLength("username", 30, "Username cannot exceed 30 characters")
      .required("email", "Email is required")
      .email("email", "Please provide a valid email address")
      .required("password", "Password is required")
      .minLength("password", 6, "Password must be at least 6 characters")
      .maxLength("password", 100, "Password cannot exceed 100 characters");
  }),

  login: validateBody((validator) => {
    validator
      .required("email", "Email is required")
      .required("password", "Password is required");
  }),
};

/**
 * AI validation middleware functions
 */
export const aiValidators = {
  testChat: validateBody((validator) => {
    validator
      .required("message", "Message is required")
      .maxLength("message", 2000, "Message cannot exceed 2000 characters");
  }),

  testCompare: validateBody((validator) => {
    validator
      .required("conclusion1", "First conclusion is required")
      .required("conclusion2", "Second conclusion is required")
      .required("guidingQuestion", "Guiding question is required")
      .required("username1", "First username is required")
      .required("username2", "Second username is required")
      .maxLength(
        "conclusion1",
        5000,
        "First conclusion cannot exceed 5000 characters"
      )
      .maxLength(
        "conclusion2",
        5000,
        "Second conclusion cannot exceed 5000 characters"
      )
      .maxLength(
        "guidingQuestion",
        500,
        "Guiding question cannot exceed 500 characters"
      );
  }),
};
