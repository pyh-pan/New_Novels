import OpenAI from "openai";

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for AI NPC responses.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export function getModelName(): string {
  return process.env.OPENAI_MODEL || "gpt-4.1-mini";
}
