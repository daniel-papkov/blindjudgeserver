import rateLimit from "express-rate-limit";
import { env } from "../config/env";

export const RateLimiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: env.MAX_REQUESTS_PER_MINUTE,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Specific limiter for Claude API endpoints
export const APILimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Math.min(env.MAX_REQUESTS_PER_MINUTE, 5), // More strict limit for Claude endpoints
  message: {
    success: false,
    message: "Too many AI requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
