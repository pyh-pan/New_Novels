import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadCasePackageFromDirectorySync } from "../lib/case-package/loader";
import { loadPlayableCase } from "../lib/case/playable-case";
import { loadBundledCase } from "../lib/case/default-case";
import {
  clearGeneratedStudioCases,
  getGeneratedStudioCase,
  getPublishedStudioCase,
  publishGeneratedStudioCase,
  saveGeneratedStudioCase,
  storeGeneratedStudioCase
} from "../lib/studio/generated-cases";

let dataDir = "";

function generatedCaseInput() {
  return {
    caseFile: {
      ...loadBundledCase("hunters-lodge"),
      id: "persisted-runtime-case",
      title: "持久化运行期案件"
    },
    sourceProfile: {
      title: "持久化运行期案件",
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
        label: "story-keep" as const,
        sourceExcerpt: "案发背景。",
        reason: "保留阅读体验。",
        destination: "story/chapter-1.md",
        playerDiscoveryRoute: "直接阅读"
      },
      {
        id: "seg-investigation",
        label: "investigation-hide" as const,
        sourceExcerpt: "侦探发现关键线索。",
        reason: "转为玩家调查。",
        destination: "clues/clues.json",
        playerDiscoveryRoute: "调查现场"
      },
      {
        id: "seg-solution",
        label: "solution-lock" as const,
        sourceExcerpt: "真相揭示。",
        reason: "最终指认后揭示。",
        destination: "truth/truth.json",
        playerDiscoveryRoute: "最终指认"
      }
    ],
    qualityReport: []
  };
}

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "new-novels-data-"));
  process.env.NEW_NOVELS_DATA_DIR = dataDir;
  clearGeneratedStudioCases();
});

afterEach(() => {
  clearGeneratedStudioCases();
  delete process.env.NEW_NOVELS_DATA_DIR;
  rmSync(dataDir, { recursive: true, force: true });
});

describe("studio filesystem persistence", () => {
  it("persists generated drafts and reloads them after the in-memory registry is cleared", () => {
    const caseId = storeGeneratedStudioCase(generatedCaseInput());
    const draftPath = join(dataDir, "studio-drafts", caseId, "draft.json");

    expect(existsSync(draftPath)).toBe(true);
    clearGeneratedStudioCases();

    expect(getGeneratedStudioCase(caseId)).toMatchObject({
      status: "draft",
      caseFile: {
        id: caseId,
        title: "持久化运行期案件"
      }
    });

    expect(saveGeneratedStudioCase(caseId)?.status).toBe("saved");
    clearGeneratedStudioCases();
    expect(getGeneratedStudioCase(caseId)?.status).toBe("saved");
  });

  it("publishes generated cases as split case packages that survive memory resets", () => {
    const caseId = storeGeneratedStudioCase(generatedCaseInput());
    const published = publishGeneratedStudioCase(caseId);
    const packageDir = join(dataDir, "published-cases", caseId);

    expect(published?.status).toBe("published");
    expect(existsSync(join(packageDir, "manifest.json"))).toBe(true);
    expect(existsSync(join(packageDir, "story", "chapter-1.md"))).toBe(true);
    expect(loadCasePackageFromDirectorySync(packageDir).caseFile.id).toBe(caseId);

    clearGeneratedStudioCases();

    expect(getPublishedStudioCase(caseId)?.caseFile.title).toBe("持久化运行期案件");
    expect(loadPlayableCase(caseId).id).toBe(caseId);
  });
});
