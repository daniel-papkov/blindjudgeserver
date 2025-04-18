import { env } from "./env";

// Original OpenAI configuration
export const OPENAI_CONFIG = {
  model: "gpt-3.5-turbo",
  //model: "gpt-4o",
  max_tokens: Number(env.MAX_TOKENS_PER_REQUEST),
  temperature: 0.7,
  system_message:
    "You are an expert in analyzing and comparing different perspectives.",
} as const;

/**
 * Application constants
 */
export const constants = {
  // Room-related constants
  room: {
    MAX_PARTICIPANTS: 2,
    STATUS: {
      ACTIVE: "active",
      COMPARING: "comparing",
      COMPLETED: "completed",
    },
  },

  // Chat-related constants
  chat: {
    MAX_MESSAGE_LENGTH: 2000,
    ROLES: {
      USER: "user",
      ASSISTANT: "assistant",
    },
  },

  // Auth-related constants
  auth: {
    MIN_PASSWORD_LENGTH: 6,
    MAX_PASSWORD_LENGTH: 100,
    MIN_USERNAME_LENGTH: 3,
    MAX_USERNAME_LENGTH: 30,
  },

  // API rate limiting
  rateLimit: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
  },

  // OpenAI configuration (referencing the original)
  openai: OPENAI_CONFIG,
};
