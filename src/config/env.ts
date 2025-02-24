// src/config/env.ts
import dotenv from "dotenv";
import { cleanEnv, str, num } from "envalid";

dotenv.config();

export const env = cleanEnv(process.env, {
  // Server
  PORT: num({ default: 3001 }),
  NODE_ENV: str({
    choices: ["development", "test", "production"],
    default: "development",
  }),

  // MongoDB
  MONGODB_URI: str(),

  // JWT
  JWT_SECRET: str(),

  // OpenAI API (replacing Claude)
  OPENAI_API_KEY: str(),

  // Rate Limiting
  MAX_TOKENS_PER_REQUEST: num({ default: 2000 }),
  MAX_CONVERSATIONS_PER_USER: num({ default: 5 }),
  MAX_REQUESTS_PER_MINUTE: num({ default: 10 }),

  // Timeouts
  CONVERSATION_TIMEOUT_MINUTES: num({ default: 30 }),
  ROOM_EXPIRY_HOURS: num({ default: 24 }),
});
