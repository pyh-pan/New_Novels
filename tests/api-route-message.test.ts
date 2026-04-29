import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("../lib/ai/openai", () => ({
  getModelName: () => "test-model",
  getOpenAIClient: () => ({
    chat: {
      completions: {
        create: createMock
      }
    }
  })
}));

const { POST } = await import("../app/api/route-message/route");

function jsonRequest(body: unknown): Request {
  return new Request("http://localhost/api/route-message", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("/api/route-message semantic routing", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("uses structured LLM routing when confidence is high", async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              targetId: "wilfred",
              confidence: 0.91,
              reason: "用户想和牧师对话"
            })
          }
        }
      ]
    });

    const response = await POST(jsonRequest({ message: "那个神职人员有没有撒谎？" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      targetId: "wilfred",
      label: "威尔弗里德牧师",
      confidence: 0.91,
      reason: "用户想和牧师对话"
    });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to deterministic routing when LLM output is invalid", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "not json" } }]
    });

    const response = await POST(jsonRequest({ message: "问威尔弗里德他在哪里" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      targetId: "wilfred",
      label: "威尔弗里德牧师"
    });
  });

  it("falls back to deterministic routing when LLM confidence is low", async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              targetId: "joe",
              confidence: 0.31,
              reason: "不确定"
            })
          }
        }
      ]
    });

    const response = await POST(jsonRequest({ message: "我想看看锤子和伤口的关系" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      targetId: "general",
      label: "调查助手"
    });
  });

  it("falls back to deterministic routing when OpenAI is unavailable", async () => {
    createMock.mockRejectedValueOnce(new Error("network"));

    const response = await POST(jsonRequest({ message: "问铁匠妻子怎么看诺曼" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      targetId: "elizabeth",
      label: "伊丽莎白"
    });
  });
});
