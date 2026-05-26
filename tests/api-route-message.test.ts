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
              targetId: "poirot",
              confidence: 0.91,
              reason: "用户想和侦探对话"
            })
          }
        }
      ]
    });

    const response = await POST(jsonRequest({ message: "波洛为什么关心衣着？" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      targetId: "poirot",
      label: "赫尔克里·波洛",
      confidence: 0.91,
      reason: "用户想和侦探对话"
    });
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to deterministic routing when LLM output is invalid", async () => {
    createMock.mockResolvedValueOnce({
      choices: [{ message: { content: "not json" } }]
    });

    const response = await POST(jsonRequest({ message: "问佐伊有没有看清访客" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      targetId: "zoe",
      label: "佐伊·哈弗林"
    });
  });

  it("falls back to deterministic routing when LLM confidence is low", async () => {
    createMock.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              targetId: "roger",
              confidence: 0.31,
              reason: "不确定"
            })
          }
        }
      ]
    });

    const response = await POST(jsonRequest({ message: "我想看看左轮和窗户的关系" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      targetId: "general",
      label: "调查助手"
    });
  });

  it("falls back to deterministic routing when OpenAI is unavailable", async () => {
    createMock.mockRejectedValueOnce(new Error("network"));

    const response = await POST(jsonRequest({ message: "问米德尔顿太太看到了什么" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      targetId: "middleton",
      label: "米德尔顿太太"
    });
  });
});
