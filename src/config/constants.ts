import { env } from "./env";

export const OPENAI_CONFIG = {
  model: "gpt-3.5-turbo",
  //model: "gpt-4o",
  max_tokens: Number(env.MAX_TOKENS_PER_REQUEST),
  temperature: 0.7,
  system_message:
    "You are an expert in analyzing and comparing different perspectives.",
} as const;
