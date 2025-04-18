import { ValidationError } from "../errors/AppError";

/**
 * Simple validation class for request data
 */
export class Validator {
  private errors: Record<string, string[]> = {};
  private data: Record<string, any>;

  /**
   * Initialize validator with data to validate
   */
  constructor(data: Record<string, any>) {
    this.data = data;
    this.errors = {};
  }

  /**
   * Validate that field exists and is not empty
   */
  required(field: string, message: string = `${field} is required`): this {
    const value = this.data[field];
    if (value === undefined || value === null || value === "") {
      this.addError(field, message);
    }
    return this;
  }

  /**
   * Validate string min length
   */
  minLength(
    field: string,
    length: number,
    message: string = `${field} must be at least ${length} characters`
  ): this {
    const value = this.data[field];
    if (
      value !== undefined &&
      value !== null &&
      typeof value === "string" &&
      value.length < length
    ) {
      this.addError(field, message);
    }
    return this;
  }

  /**
   * Validate string max length
   */
  maxLength(
    field: string,
    length: number,
    message: string = `${field} must not exceed ${length} characters`
  ): this {
    const value = this.data[field];
    if (
      value !== undefined &&
      value !== null &&
      typeof value === "string" &&
      value.length > length
    ) {
      this.addError(field, message);
    }
    return this;
  }

  /**
   * Validate with regex pattern
   */
  matches(
    field: string,
    pattern: RegExp,
    message: string = `${field} format is invalid`
  ): this {
    const value = this.data[field];
    if (
      value !== undefined &&
      value !== null &&
      typeof value === "string" &&
      !pattern.test(value)
    ) {
      this.addError(field, message);
    }
    return this;
  }

  /**
   * Validate email format
   */
  email(
    field: string,
    message: string = `${field} must be a valid email address`
  ): this {
    return this.matches(
      field,
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      message
    );
  }

  /**
   * Validate that value is one of the allowed values
   */
  oneOf(
    field: string,
    allowedValues: any[],
    message: string = `${field} must be one of: ${allowedValues.join(", ")}`
  ): this {
    const value = this.data[field];
    if (
      value !== undefined &&
      value !== null &&
      !allowedValues.includes(value)
    ) {
      this.addError(field, message);
    }
    return this;
  }

  /**
   * Custom validation function
   */
  custom(
    field: string,
    validationFn: (value: any) => boolean,
    message: string
  ): this {
    const value = this.data[field];
    if (value !== undefined && !validationFn(value)) {
      this.addError(field, message);
    }
    return this;
  }

  /**
   * Add error for a field
   */
  private addError(field: string, message: string): void {
    if (!this.errors[field]) {
      this.errors[field] = [];
    }
    this.errors[field].push(message);
  }

  /**
   * Check if validation has errors
   */
  hasErrors(): boolean {
    return Object.keys(this.errors).length > 0;
  }

  /**
   * Get all validation errors
   */
  getErrors(): Record<string, string[]> {
    return this.errors;
  }

  /**
   * Throw validation error if validation failed
   */
  throwIfErrors(): void {
    if (this.hasErrors()) {
      throw new ValidationError("Validation failed", this.errors);
    }
  }
}

/**
 * Validate request data and throw if invalid
 */
export function validate(
  data: Record<string, any>,
  validationFn: (validator: Validator) => void
): void {
  const validator = new Validator(data);
  validationFn(validator);
  validator.throwIfErrors();
}
