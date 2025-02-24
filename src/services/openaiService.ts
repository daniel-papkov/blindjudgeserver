// src/services/openaiService.ts
import { env } from "../config/env";
import { OPENAI_CONFIG } from "../config/constants";
import OpenAI from "openai";

class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  async sendMessage(
    message: string | undefined,
    chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [],
    guidingQuestion?: string
  ) {
    try {
      const systemMessage = guidingQuestion
        ? `You are a debate assistant. Current discussion topic: "${guidingQuestion}". ${OPENAI_CONFIG.system_message}`
        : OPENAI_CONFIG.system_message;

      const messages = [
        { role: "system", content: systemMessage },
        ...chatHistory,
        { role: "user", content: message },
      ] as OpenAI.Chat.ChatCompletionMessageParam[];

      const response = await this.openai.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: messages,
        max_tokens: OPENAI_CONFIG.max_tokens,
        temperature: OPENAI_CONFIG.temperature,
      });

      return {
        success: true,
        message:
          response.choices[0]?.message?.content || "No response generated",
      };
    } catch (error) {
      console.error("OpenAI API Error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async compareConclusions(
    conclusion1: string,
    conclusion2: string,
    guidingQuestion: string,
    username1: string,
    username2: string
  ) {
    const comparisonPrompt = `
      You are tasked with comparing two different conclusions about the following question,who is correct?. the question:
      "${guidingQuestion}"

      ${username1}:
      "${conclusion1}"

      ${username2}:
      "${conclusion2}"

      focus on the question, be consice.
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: OPENAI_CONFIG.model,
        messages: [
          { role: "system", content: OPENAI_CONFIG.system_message },
          { role: "user", content: comparisonPrompt },
        ],
        max_tokens: OPENAI_CONFIG.max_tokens,
        temperature: OPENAI_CONFIG.temperature,
      });

      return {
        success: true,
        comparison:
          response.choices[0]?.message?.content || "No comparison generated",
      };
    } catch (error) {
      console.error("OpenAI API Error:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

export const openaiService = new OpenAIService();
