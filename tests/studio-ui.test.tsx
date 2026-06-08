import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import StudioHome from "../components/StudioHome";
import StudioWorkbench from "../components/StudioWorkbench";
import { loadBundledCase } from "../lib/case/default-case";
import { createStudioDraftView } from "../lib/studio/draft";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("StudioHome", () => {
  it("keeps the studio entrance focused on source upload and package import", () => {
    render(<StudioHome />);

    expect(screen.getByRole("button", { name: /上传原文/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /导入案件包/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "返回故事书架" })).toHaveAttribute("href", "/");
  });

  it("creates a source generation job from a text file", async () => {
    const navigateTo = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "source-demo",
          status: "ready",
          progress: 100,
          currentStep: "已生成可审阅草稿",
          draftCaseId: "hunters-lodge",
          steps: [{ id: "parse", label: "解析文件与元数据", status: "done" }]
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "source-demo",
          status: "ready",
          progress: 100,
          currentStep: "已生成可审阅草稿",
          draftCaseId: "hunters-lodge",
          steps: [{ id: "parse", label: "解析文件与元数据", status: "done" }]
        })
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<StudioHome navigateTo={navigateTo} />);

    fireEvent.click(screen.getByRole("button", { name: /上传原文/ }));
    fireEvent.change(screen.getByLabelText("选择原文文件"), {
      target: { files: [new File(["故事"], "story.txt", { type: "text/plain" })] }
    });

    expect(await screen.findByText("已生成可审阅草稿")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/studio/source-jobs",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) })
    );
    expect(navigateTo).toHaveBeenCalledWith("/studio/cases/hunters-lodge");
  });

  it("previews a case package before entering the workbench", async () => {
    const navigateTo = vi.fn();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        draftCaseId: "custom-case",
        status: "draft",
        manifest: {
          schemaVersion: "case-package/v1",
          caseId: "custom-case",
          title: "自定义案件"
        },
        caseSummary: {
          id: "custom-case",
          title: "自定义案件",
          chapters: 4,
          agents: 6,
          acts: 3,
          clues: 12,
          accusationQuestions: 4
        },
        issues: []
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<StudioHome navigateTo={navigateTo} />);

    fireEvent.click(screen.getByRole("button", { name: /导入案件包/ }));
    fireEvent.change(screen.getByLabelText("选择案件包 zip"), {
      target: { files: [new File(["zip"], "custom-case.zip", { type: "application/zip" })] }
    });

    expect(await screen.findByText("自定义案件")).toBeInTheDocument();
    expect(screen.getByText("校验通过，可以进入审阅。")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/cases/preview",
      expect.objectContaining({ method: "POST", body: expect.any(FormData) })
    );
    expect(navigateTo).toHaveBeenCalledWith("/studio/cases/custom-case");
  });
});

describe("StudioWorkbench", () => {
  it("shows complete review surfaces and comment workflow", async () => {
    render(<StudioWorkbench draft={createStudioDraftView(loadBundledCase("hunters-lodge"))} />);

    expect(screen.getByRole("heading", { name: "故事可玩性与真相路径" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "2. 第二章 荒原上的枪声" }));
    expect(screen.getByRole("heading", { name: "第二章 荒原上的枪声" })).toBeInTheDocument();
    expect(screen.getByText("第二章 荒原上的枪声", { selector: "summary" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "佐伊·哈弗林" }));
    expect(screen.getByRole("heading", { name: "佐伊·哈弗林" })).toBeInTheDocument();
    expect(screen.getByText("章节约束矩阵")).toBeInTheDocument();

    expect(screen.queryByText(/批注待提交/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("修改建议"), {
      target: { value: "第二幕里佐伊的隐瞒边界需要更明确。" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提交修改建议" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "已提交 1 条" })).toBeInTheDocument();
    });
  });
});
