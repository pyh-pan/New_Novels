import { describe, expect, it } from "vitest";

import {
  buildRunwayAnthropicRequest,
  parseProperties
} from "../lib/ai/provider";

describe("AI provider adapter", () => {
  it("parses ai.properties keys with the required prefix", () => {
    expect(
      parseProperties(`
        ai.base_url=https://runway.example/openai
        ai.api_key=secret
        ignored=value
      `)
    ).toMatchObject({
      "ai.base_url": "https://runway.example/openai",
      "ai.api_key": "secret"
    });
  });

  it("converts chat messages to Runway Bedrock Anthropic format", () => {
    const request = buildRunwayAnthropicRequest({
      messages: [
        { role: "system", content: "系统规则" },
        { role: "user", content: "检查锤子" },
        { role: "assistant", content: "锤子很轻。" }
      ]
    });

    expect(request).toEqual({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1024,
      system: "系统规则",
      messages: [
        { role: "user", content: "检查锤子" },
        { role: "assistant", content: "锤子很轻。" }
      ]
    });
    expect(request).not.toHaveProperty("model");
    expect(request).not.toHaveProperty("temperature");
  });
});
