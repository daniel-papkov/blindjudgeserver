/**
 * Logger utility for application-wide logging
 */
class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== "production";
  }

  /**
   * Log info message
   */
  info(message: string, meta: Record<string, any> = {}) {
    this.log("INFO", message, meta);
  }

  /**
   * Log warning message
   */
  warn(message: string, meta: Record<string, any> = {}) {
    this.log("WARN", message, meta);
  }

  /**
   * Log error message
   */
  error(message: string, meta: Record<string, any> = {}) {
    this.log("ERROR", message, meta);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message: string, meta: Record<string, any> = {}) {
    if (this.isDevelopment) {
      this.log("DEBUG", message, meta);
    }
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string, meta: Record<string, any> = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta,
    };

    // In a real app, this could write to a file, send to a logging service, etc.
    // For simplicity, we're just using console.log here
    if (level === "ERROR") {
      console.error(JSON.stringify(logEntry));
    } else if (level === "WARN") {
      console.warn(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
}

export const logger = new Logger();
