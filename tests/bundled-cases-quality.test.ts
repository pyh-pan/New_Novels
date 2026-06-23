import { describe, expect, it } from "vitest";

import { bundledCaseIds } from "../lib/case/catalog";
import { loadBundledCase } from "../lib/case/default-case";
import { caseSchema } from "../lib/case/schema";
import { checkAccusationAnswer } from "../lib/game/accusation";

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

  it("keeps Hunter's Lodge investigation findings in the playable layer", () => {
    const parsed = caseSchema.parse(loadBundledCase("hunters-lodge"));
    const chapterText = parsed.chapters.map((chapter) => chapter.body).join("\n");

    [
      "家政介绍所",
      "车行和马车",
      "伊灵",
      "债务缠身",
      "没有新女管家抵达的痕迹"
    ].forEach((leakedInvestigationFinding) => {
      expect(chapterText).not.toContain(leakedInvestigationFinding);
    });

    expect(parsed.facts.map((fact) => fact.id)).toEqual(
      expect.arrayContaining([
        "fact-agency-denies-middleton",
        "fact-middleton-no-transport",
        "fact-ealing-revolver-found",
        "fact-roger-debts"
      ])
    );
  });

  it("keeps Hunter's Lodge midgame clues discoverable instead of pre-visible", () => {
    const parsed = caseSchema.parse(loadBundledCase("hunters-lodge"));
    const testimonyAct = parsed.acts.find((act) => act.id === "act-testimony");
    const confrontationAct = parsed.acts.find((act) => act.id === "act-confrontation");

    expect(testimonyAct?.visibleClueIds).not.toEqual(
      expect.arrayContaining([
        "clue-agency-denial",
        "clue-transport-gap",
        "clue-middleton-vanished",
        "clue-zoe-actress",
        "clue-never-seen-together"
      ])
    );
    expect(confrontationAct?.availableAgentIds).not.toContain("middleton");
  });

  it("accepts natural Hunter's Lodge accusation answers", () => {
    const parsed = caseSchema.parse(loadBundledCase("hunters-lodge"));
    const questions = new Map(parsed.accusation.questions.map((question) => [question.id, question]));

    expect(
      checkAccusationAnswer(
        questions.get("accuse-culprits")!,
        "开枪的是佐伊，罗杰是共犯，二人合谋杀了佩斯"
      ).correct
    ).toBe(true);
    expect(
      checkAccusationAnswer(
        questions.get("accuse-middleton")!,
        "所谓女管家其实是佐伊换装扮出来的假身份"
      ).correct
    ).toBe(true);
    expect(
      checkAccusationAnswer(
        questions.get("accuse-revolver")!,
        "那把枪是罗杰投放在伦敦的嫁祸假线索"
      ).correct
    ).toBe(true);
  });
});
