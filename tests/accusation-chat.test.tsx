import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import AccusationChat from "../components/AccusationChat";
import AccusePage from "../app/accuse/page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AccusationChat", () => {
  it("fetches and renders the first accusation question", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ questionIndex: 0, prompt: "谁是真凶？" })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AccusationChat />);

    expect(await screen.findByText("谁是真凶？")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/accuse");
  });

  it("shows continue investigation when an answer is wrong", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questionIndex: 0, prompt: "谁是真凶？" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "wrong" })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<AccusationChat />);

    fireEvent.change(await screen.findByLabelText("回答"), {
      target: { value: "错误答案" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    await waitFor(() => {
      expect(screen.getByText("回答错误")).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "继续调查" })).toHaveAttribute("href", "/");
  });

  it("posts the current answer and renders the next question", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questionIndex: 0, prompt: "谁是真凶？" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "next",
          questionIndex: 1,
          prompt: "作案手法是什么？"
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<AccusationChat />);

    fireEvent.change(await screen.findByLabelText("回答"), {
      target: { value: "佐伊和罗杰" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(await screen.findByText("作案手法是什么？")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/accuse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIndex: 0, answer: "佐伊和罗杰" })
    });
  });

  it("ignores duplicate submits before the first post resolves", async () => {
    let resolvePost: (value: { ok: boolean; json: () => Promise<{ status: "next"; questionIndex: number; prompt: string }> }) => void;
    const postPromise = new Promise<{
      ok: boolean;
      json: () => Promise<{ status: "next"; questionIndex: number; prompt: string }>;
    }>((resolve) => {
      resolvePost = resolve;
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questionIndex: 0, prompt: "谁是真凶？" })
      })
      .mockReturnValueOnce(postPromise);
    vi.stubGlobal("fetch", fetchMock);

    render(<AccusationChat />);

    const input = await screen.findByLabelText("回答");
    fireEvent.change(input, { target: { value: "佐伊和罗杰" } });

    const form = input.closest("form");
    if (!form) {
      throw new Error("Expected accusation form");
    }

    act(() => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });

    expect(
      fetchMock.mock.calls.filter(
        ([url, options]) =>
          url === "/api/accuse" &&
          typeof options === "object" &&
          options !== null &&
          "method" in options &&
          options.method === "POST"
      )
    ).toHaveLength(1);

    resolvePost!({
      ok: true,
      json: async () => ({
        status: "next",
        questionIndex: 1,
        prompt: "作案手法是什么？"
      })
    });
    expect(await screen.findByText("作案手法是什么？")).toBeInTheDocument();
  });

  it("restores the attempted answer without recording accepted history when post fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questionIndex: 0, prompt: "谁是真凶？" })
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({})
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<AccusationChat />);

    fireEvent.change(await screen.findByLabelText("回答"), {
      target: { value: "待重试答案" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(await screen.findByText("回答提交失败。请稍后再试。")).toBeInTheDocument();
    expect(screen.getByLabelText("回答")).toHaveValue("待重试答案");
    expect(screen.queryByText("回答错误")).not.toBeInTheDocument();
    expect(screen.queryAllByText("待重试答案")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "提交" })).toBeEnabled();
  });

  it("shows truth revealed and end game when all answers are correct", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questionIndex: 0, prompt: "谁是真凶？" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "solved",
          truth: {
            culpritName: "佐伊和罗杰",
            method: "佐伊伪装成米德尔顿太太，罗杰布置伦敦左轮假线索。",
            motive: "为了继承佩斯的遗产。",
            decisiveEvidence: ["米德尔顿身份无法成立", "伊灵左轮像被故意投放"]
          }
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<AccusationChat />);

    fireEvent.change(await screen.findByLabelText("回答"), {
      target: { value: "正确答案" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提交" }));

    expect(await screen.findByText("真相大白")).toBeInTheDocument();
    expect(screen.getByText("佐伊和罗杰")).toBeInTheDocument();
    expect(screen.getByText("佐伊伪装成米德尔顿太太，罗杰布置伦敦左轮假线索。")).toBeInTheDocument();
    expect(screen.getByText("米德尔顿身份无法成立")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "结束游戏" })).toHaveAttribute("href", "/");
  });
});

describe("AccusePage", () => {
  it("renders the accusation chat surface", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questionIndex: 0, prompt: "最后的问题" })
      })
    );

    render(<AccusePage />);

    expect(await screen.findByText("最后的问题")).toBeInTheDocument();
  });
});
