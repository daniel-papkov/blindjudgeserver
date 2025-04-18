import dotenv from "dotenv";
import { constants, OPENAI_CONFIG } from "./constants";
import { env } from "./env";

// Load environment variables
dotenv.config();

// Database configuration
const databaseConfig = {
  url: process.env.MONGODB_URI || "mongodb://localhost:27017/chat_app",
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
};

// Server configuration
const serverConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  env: process.env.NODE_ENV || "development",
  jwtSecret:
    process.env.JWT_SECRET || "default_jwt_secret_change_in_production",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

// API rate limits
const rateLimitConfig = {
  windowMs: constants.rateLimit.WINDOW_MS,
  max: constants.rateLimit.MAX_REQUESTS,
  message: "Too many requests from this IP, please try again later",
};

// OpenAI configuration
const openaiConfig = {
  apiKey: process.env.OPENAI_API_KEY || "",
  model: OPENAI_CONFIG.model,
  maxTokens: OPENAI_CONFIG.max_tokens,
  temperature: OPENAI_CONFIG.temperature,
  systemMessage: OPENAI_CONFIG.system_message,
};

// Logger configuration
const loggerConfig = {
  level: process.env.LOG_LEVEL || "info",
  enabled: true,
};

// Export all configurations
export const config = {
  database: databaseConfig,
  server: serverConfig,
  rateLimit: rateLimitConfig,
  openai: openaiConfig,
  logger: loggerConfig,
  constants,
};
