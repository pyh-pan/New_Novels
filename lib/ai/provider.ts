import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CreateChatCompletionInput = {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
};

type RunwayRequestInput = {
  messages: AIMessage[];
  maxTokens?: number;
};

type AIProviderConfig =
  {
    kind: "runway";
    baseUrl: string;
    apiKey: string;
  };

const anthropicVersion = "bedrock-2023-05-31";

export function parseProperties(content: string): Record<string, string> {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        if (separator === -1) {
          return [line, ""];
        }
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      })
  );
}

function findPropertiesFile(filename: string): string | undefined {
  const candidates = [
    resolve(/* turbopackIgnore: true */ process.cwd(), filename),
    resolve(/* turbopackIgnore: true */ process.cwd(), "..", "..", filename),
    process.env.AI_PROPERTIES_PATH ? resolve(process.env.AI_PROPERTIES_PATH) : ""
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

function loadAIProperties(): Record<string, string> {
  const propertiesFile = findPropertiesFile("ai.properties");

  if (!propertiesFile) {
    return {};
  }

  return parseProperties(readFileSync(propertiesFile, "utf8"));
}

export function getAIProviderConfig(): AIProviderConfig {
  const properties = loadAIProperties();
  const runwayBaseUrl = properties["ai.base_url"] || process.env.APP_AI_BASE_URL;
  const runwayApiKey = properties["ai.api_key"] || process.env.APP_AI_API_KEY;

  if (runwayBaseUrl && runwayApiKey) {
    return {
      kind: "runway",
      baseUrl: runwayBaseUrl.replace(/\/$/, ""),
      apiKey: runwayApiKey
    };
  }

  throw new Error("AI provider is not configured. Provide ai.properties or APP_AI_* variables.");
}

export function getModelName(): string {
  getAIProviderConfig();

  return "runway-bedrock";
}

export function buildRunwayAnthropicRequest({
  messages,
  maxTokens = 1024
}: RunwayRequestInput) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");

  return {
    anthropic_version: anthropicVersion,
    max_tokens: maxTokens,
    system,
    messages: messages
      .filter((message) => message.role !== "system")
      .map((message) => ({
        role: message.role,
        content: message.content
      }))
  };
}

function parseRunwayText(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }
  if (typeof payload !== "object" || payload === null) {
    return "";
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.Error === "string") {
    throw new Error(record.Error);
  }
  if (typeof record.error === "string") {
    throw new Error(record.error);
  }
  if (typeof record.completion === "string") {
    return record.completion;
  }
  if (typeof record.output === "string") {
    return record.output;
  }
  if (Array.isArray(record.content)) {
    return record.content
      .map((item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { text?: unknown }).text === "string"
          ? (item as { text: string }).text
          : ""
      )
      .join("");
  }

  return "";
}

async function callRunway(config: AIProviderConfig, input: CreateChatCompletionInput) {
  const response = await fetch(`${config.baseUrl}/bedrock_runtime/model/invoke`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      token: config.apiKey,
      "api-key": config.apiKey
    },
    body: JSON.stringify(
      buildRunwayAnthropicRequest({
        messages: input.messages,
        maxTokens: input.maxTokens
      })
    )
  });

  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error("Runway AI request failed.");
  }

  return parseRunwayText(payload);
}

export async function createChatCompletion(input: CreateChatCompletionInput): Promise<string> {
  const config = getAIProviderConfig();

  return callRunway(config, input);
}
