import { describe, expect, it } from "vitest";
import { caseSchema } from "../lib/case/schema";
import { hammerOfGodCase } from "../lib/case/hammer-of-god";

describe("case schema", () => {
  it("validates the Hammer of God case and preserves canonical ids", () => {
    const parsed = caseSchema.parse(hammerOfGodCase);

    expect(parsed.id).toBe("hammer-of-god");
    expect(parsed.victims.map((victim) => victim.id)).toContain("norman");
    expect(parsed.globalContext.fairPlayRules.length).toBeGreaterThan(0);
    expect(parsed.agents.map((agent) => agent.id)).toEqual([
      "general",
      "wilfred",
      "simeon",
      "elizabeth",
      "joe"
    ]);
    expect(parsed.agents.find((agent) => agent.id === "general")?.type).toBe("general");
    expect(parsed.clues.map((clue) => clue.id)).toEqual([
      "small-hammer",
      "wilfred-denial",
      "tower-height"
    ]);
    expect(parsed.accusation.questions.map((question) => question.id)).toEqual([
      "culprit",
      "method",
      "contradiction",
      "motive"
    ]);
  });

  it("rejects duplicate agent ids", () => {
    expect(() =>
      caseSchema.parse({
        ...hammerOfGodCase,
        agents: [
          hammerOfGodCase.agents[0],
          { ...hammerOfGodCase.agents[1], id: hammerOfGodCase.agents[0].id }
        ]
      })
    ).toThrow();
  });

  it("requires a general agent", () => {
    expect(() =>
      caseSchema.parse({
        ...hammerOfGodCase,
        agents: hammerOfGodCase.agents.filter((agent) => agent.id !== "general")
      })
    ).toThrow();
  });

  it("rejects reveal rules that reference unknown clues", () => {
    const wilfred = hammerOfGodCase.agents.find((agent) => agent.id === "wilfred");
    if (!wilfred) {
      throw new Error("Expected wilfred agent");
    }

    expect(() =>
      caseSchema.parse({
        ...hammerOfGodCase,
        agents: hammerOfGodCase.agents.map((agent) =>
          agent.id === "wilfred"
            ? {
                ...wilfred,
                revealRules: [
                  ...wilfred.revealRules,
                  {
                    fact: "未知线索触发的事实",
                    requiresClues: ["missing-clue"],
                    revealMode: "direct"
                  }
                ]
              }
            : agent
        )
      })
    ).toThrow();
  });

  it("rejects duplicate clue ids", () => {
    expect(() =>
      caseSchema.parse({
        ...hammerOfGodCase,
        clues: [
          hammerOfGodCase.clues[0],
          { ...hammerOfGodCase.clues[1], id: hammerOfGodCase.clues[0].id }
        ]
      })
    ).toThrow();
  });

  it("rejects duplicate accusation question ids", () => {
    expect(() =>
      caseSchema.parse({
        ...hammerOfGodCase,
        accusation: {
          questions: [
            hammerOfGodCase.accusation.questions[0],
            {
              ...hammerOfGodCase.accusation.questions[1],
              id: hammerOfGodCase.accusation.questions[0].id
            }
          ]
        }
      })
    ).toThrow();
  });

  it("rejects duplicate victim ids", () => {
    const result = caseSchema.safeParse({
      ...hammerOfGodCase,
      victims: [
        hammerOfGodCase.victims[0],
        { ...hammerOfGodCase.victims[0], name: "另一个受害者" }
      ]
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["victims"],
          message: expect.stringContaining("Victim ids must be unique")
        })
      ])
    );
  });

  it("rejects blank required strings and blank accepted answers", () => {
    expect(() =>
      caseSchema.parse({
        ...hammerOfGodCase,
        title: "   "
      })
    ).toThrow();

    expect(() =>
      caseSchema.parse({
        ...hammerOfGodCase,
        accusation: {
          questions: [
            {
              ...hammerOfGodCase.accusation.questions[0],
              acceptedAnswers: ["威尔弗里德", "   "]
            }
          ]
        }
      })
    ).toThrow();
  });

  it("rejects truth.culprit when not found in agents", () => {
    expect(() =>
      caseSchema.parse({
        ...hammerOfGodCase,
        truth: {
          ...hammerOfGodCase.truth,
          culprit: "unknown"
        }
      })
    ).toThrow();
  });

  it("rejects truth.victim when not found in victims", () => {
    expect(() =>
      caseSchema.parse({
        ...hammerOfGodCase,
        truth: {
          ...hammerOfGodCase.truth,
          victim: "unknown"
        }
      })
    ).toThrow();
  });

  it("keeps the first clue observational rather than revealing the high-fall method", () => {
    const firstClue = hammerOfGodCase.clues[0];

    expect(firstClue.text).not.toContain("高处坠落");
    expect(firstClue.text).toContain("小锤很轻");
    expect(firstClue.text).toContain("严重伤势不相称");
  });
});
