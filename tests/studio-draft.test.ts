import { describe, expect, it } from "vitest";

import { loadBundledCase } from "../lib/case/default-case";
import { createStudioDraftView, createStudioDraftViewWithAdaptation } from "../lib/studio/draft";

describe("studio draft view", () => {
  it("exposes complete review sections for a case package", () => {
    const view = createStudioDraftView(loadBundledCase("hunters-lodge"));

    expect(view.tree.map((node) => node.id)).toEqual([
      "dashboard",
      "chapters",
      "agents",
      "clues",
      "contradictions",
      "events",
      "acts",
      "accusation",
      "validation"
    ]);
    expect(view.stats).toMatchObject({
      chapters: 3,
      agents: 6,
      acts: 3,
      storyEvents: expect.any(Number)
    });
    expect(view.stats.storyEvents).toBeGreaterThan(0);
    expect(view.storyEvents.map((event) => event.kind)).toEqual(
      expect.arrayContaining(["instant-result", "story-beat"])
    );
    expect(view.chapters[1]).toMatchObject({
      title: "猎人小屋疑案",
      subtitle: "第二章 荒原上的枪声"
    });
    expect(view.chapters[0].hiddenInvestigation.length).toBeGreaterThan(0);
    expect(view.agents.find((agent) => agent.id === "zoe")?.actMatrix).toHaveLength(3);
    expect(view.accusation[0].supportingEvidence.length).toBeGreaterThan(0);
  });

  it("exposes adaptation notes for generated Studio drafts", () => {
    const view = createStudioDraftViewWithAdaptation(loadBundledCase("hunters-lodge"), {
      sourceProfile: {
        title: "猎人小屋疑案",
        author: "Agatha Christie",
        language: "zh-CN",
        narrativeForm: "第三人称短篇推理",
        structureNotes: ["包含案发、调查、误导和真相。"],
        adaptationStrategy: ["保留故事阅读，隐藏侦探推理。"],
        rightsNote: "测试。"
      },
      segmentation: [],
      qualityReport: [],
      adaptationNotesMarkdown: "# 猎人小屋疑案 改写说明\n\n## Fair-Play Spine\n\n保留误导并隐藏真相。"
    });

    expect(view.tree.map((node) => node.id)).toContain("adaptation-notes");
    expect(view.adaptationNotesMarkdown).toContain("Fair-Play Spine");
  });
});
