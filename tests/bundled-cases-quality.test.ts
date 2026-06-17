import { describe, expect, it } from "vitest";

import { bundledCaseIds } from "../lib/case/catalog";
import { loadBundledCase } from "../lib/case/default-case";
import { caseSchema } from "../lib/case/schema";

const storyEventKinds = [
  "instant-result",
  "agent-state-change",
  "story-beat",
  "act-transition"
];

describe("bundled case quality", () => {
  it("keeps every bundled case schema-valid and runtime-ready", () => {
    for (const caseId of bundledCaseIds) {
      const parsed = caseSchema.parse(loadBundledCase(caseId));
      const npcAgents = parsed.agents.filter((agent) => agent.type === "npc");

      expect(parsed.chapters.length, caseId).toBeGreaterThanOrEqual(3);
      expect(parsed.actGates.length, caseId).toBeGreaterThanOrEqual(2);
      expect(parsed.accusation.questions.length, caseId).toBeGreaterThanOrEqual(4);
      expect(parsed.storyEvents.map((event) => event.kind), caseId).toEqual(
        expect.arrayContaining(storyEventKinds)
      );
      expect(parsed.chapters.every((chapter) => chapter.body.length >= 900), caseId).toBe(
        true
      );
      expect(
        npcAgents.every((agent) => {
          const nonLanguageNpc =
            agent.revealRules.length === 0 &&
            agent.permissions.canRevealUnsolvedClues === false &&
            agent.boundaries.forbiddenClaims.some((claim) =>
              claim.includes("不得回答人类语言问题")
            );

          return (
            agent.pressureProfile.increaseRules.length > 0 &&
            agent.emotionalArc.calm.length > 0 &&
            agent.confrontationTriggers.length > 0 &&
            agent.confessionBoundary.length > 0 &&
            agent.styleAnchors.length > 0 &&
            (agent.revealRules.length > 0 || nonLanguageNpc)
          );
        }),
        caseId
      ).toBe(true);
    }
  });
});
