import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as publishPost } from "../app/api/studio/cases/[caseId]/publish/route";
import { POST as savePost } from "../app/api/studio/cases/[caseId]/save/route";
import { caseToShelfItem, getPublishedCaseShelfItems } from "../lib/case/catalog";
import { loadBundledCase } from "../lib/case/default-case";
import {
  clearGeneratedStudioCases,
  getGeneratedStudioCase,
  getPublishedStudioCase,
  saveGeneratedStudioCase,
  storeGeneratedStudioCase,
  publishGeneratedStudioCase
} from "../lib/studio/generated-cases";

let dataDir = "";

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "new-novels-publish-"));
  process.env.NEW_NOVELS_DATA_DIR = dataDir;
  clearGeneratedStudioCases();
});

afterEach(() => {
  clearGeneratedStudioCases();
  delete process.env.NEW_NOVELS_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

describe("studio generated case lifecycle", () => {
  it("keeps uploaded cases out of the shelf until they are published", () => {
    const caseFile = {
      ...loadBundledCase("hammer-of-god"),
      id: "runtime-uploaded-case",
      title: "运行期上传案件"
    };

    const caseId = storeGeneratedStudioCase({
      caseFile,
      sourceProfile: {
        title: "运行期上传案件",
        author: "测试作者",
        language: "zh-CN",
        narrativeForm: "第三人称推理短篇",
        structureNotes: ["有明确案发、调查和真相。"],
        adaptationStrategy: ["按原文结构生成互动案件。"],
        rightsNote: "测试文本。"
      },
      segmentation: [
        {
          id: "seg-story",
          label: "story-keep",
          sourceExcerpt: "案发背景。",
          reason: "保留阅读体验。",
          destination: "story/chapter-1.md",
          playerDiscoveryRoute: "直接阅读"
        },
        {
          id: "seg-investigation",
          label: "investigation-hide",
          sourceExcerpt: "侦探发现关键线索。",
          reason: "转为玩家调查。",
          destination: "clues/clues.json",
          playerDiscoveryRoute: "调查现场"
        },
        {
          id: "seg-solution",
          label: "solution-lock",
          sourceExcerpt: "真相揭示。",
          reason: "最终指认后揭示。",
          destination: "truth/truth.json",
          playerDiscoveryRoute: "最终指认"
        }
      ],
      qualityReport: []
    });

    expect(getGeneratedStudioCase(caseId)?.status).toBe("draft");
    expect(getPublishedCaseShelfItems().map((item) => item.id)).not.toContain(caseId);

    expect(saveGeneratedStudioCase(caseId)?.status).toBe("saved");
    expect(getPublishedCaseShelfItems().map((item) => item.id)).not.toContain(caseId);

    expect(publishGeneratedStudioCase(caseId)?.status).toBe("published");
    expect(getPublishedStudioCase(caseId)?.caseFile.id).toBe(caseId);
    expect(getPublishedCaseShelfItems()).toContainEqual(caseToShelfItem(caseFile));
  });

  it("does not publish unknown drafts", () => {
    expect(saveGeneratedStudioCase("missing")).toBeUndefined();
    expect(publishGeneratedStudioCase("missing")).toBeUndefined();
    expect(getPublishedStudioCase("missing")).toBeUndefined();
  });

  it("exposes save and publish API actions for generated drafts", async () => {
    const caseFile = {
      ...loadBundledCase("hammer-of-god"),
      id: "api-uploaded-case",
      title: "API 上传案件"
    };
    const caseId = storeGeneratedStudioCase({
      caseFile,
      sourceProfile: {
        title: "API 上传案件",
        author: "测试作者",
        language: "zh-CN",
        narrativeForm: "第三人称推理短篇",
        structureNotes: ["有明确案发、调查和真相。"],
        adaptationStrategy: ["按原文结构生成互动案件。"],
        rightsNote: "测试文本。"
      },
      segmentation: [
        {
          id: "seg-story",
          label: "story-keep",
          sourceExcerpt: "案发背景。",
          reason: "保留阅读体验。",
          destination: "story/chapter-1.md",
          playerDiscoveryRoute: "直接阅读"
        },
        {
          id: "seg-investigation",
          label: "investigation-hide",
          sourceExcerpt: "侦探发现关键线索。",
          reason: "转为玩家调查。",
          destination: "clues/clues.json",
          playerDiscoveryRoute: "调查现场"
        },
        {
          id: "seg-solution",
          label: "solution-lock",
          sourceExcerpt: "真相揭示。",
          reason: "最终指认后揭示。",
          destination: "truth/truth.json",
          playerDiscoveryRoute: "最终指认"
        }
      ],
      qualityReport: []
    });
    const params = Promise.resolve({ caseId });

    const saveResponse = await savePost(new Request("http://localhost"), { params });
    await expect(saveResponse.json()).resolves.toMatchObject({
      caseId,
      status: "saved"
    });

    const publishResponse = await publishPost(new Request("http://localhost"), {
      params: Promise.resolve({ caseId })
    });

    await expect(publishResponse.json()).resolves.toMatchObject({
      caseId,
      status: "published",
      playHref: `/cases/${caseId}`
    });
  });
});
