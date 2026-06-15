import { describe, expect, it } from "vitest";
import { caseSchema } from "../lib/case/schema";
import { loadBundledCase } from "../lib/case/default-case";

const huntersLodgeCase = loadBundledCase("hunters-lodge");

describe("case schema", () => {
  it("validates the Hunter's Lodge case and preserves canonical ids", () => {
    const parsed = caseSchema.parse(huntersLodgeCase);

    expect(parsed.id).toBe("hunters-lodge");
    expect(parsed.victims.map((victim) => victim.id)).toContain("harrington-pace");
    expect(parsed.globalContext.fairPlayRules.length).toBeGreaterThan(0);
    expect(parsed.agents.map((agent) => agent.id)).toEqual([
      "general",
      "japp",
      "middleton",
      "poirot",
      "roger",
      "zoe"
    ]);
    expect(parsed.agents.find((agent) => agent.id === "general")?.type).toBe("general");
    expect(parsed.clues.map((clue) => clue.id)).toContain("clue-middleton-testimony");
    expect(parsed.clues.map((clue) => clue.id)).toContain("clue-ealing-revolver");
    expect(parsed.storyEvents.map((event) => event.kind)).toEqual(
      expect.arrayContaining([
        "instant-result",
        "agent-state-change",
        "story-beat",
        "act-transition"
      ])
    );
    expect(parsed.accusation.questions.map((question) => question.id)).toEqual([
      "accuse-culprits",
      "accuse-middleton",
      "accuse-revolver",
      "accuse-motive"
    ]);
  });

  it("rejects duplicate agent ids", () => {
    expect(() =>
      caseSchema.parse({
        ...huntersLodgeCase,
        agents: [
          huntersLodgeCase.agents[0],
          { ...huntersLodgeCase.agents[1], id: huntersLodgeCase.agents[0].id }
        ]
      })
    ).toThrow();
  });

  it("requires a general agent", () => {
    expect(() =>
      caseSchema.parse({
        ...huntersLodgeCase,
        agents: huntersLodgeCase.agents.filter((agent) => agent.id !== "general")
      })
    ).toThrow();
  });

  it("rejects reveal rules that reference unknown clues", () => {
    const middleton = huntersLodgeCase.agents.find((agent) => agent.id === "middleton");
    if (!middleton) {
      throw new Error("Expected middleton agent");
    }

    expect(() =>
      caseSchema.parse({
        ...huntersLodgeCase,
        agents: huntersLodgeCase.agents.map((agent) =>
          agent.id === "middleton"
            ? {
                ...middleton,
                revealRules: [
                  ...middleton.revealRules,
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

  it("rejects pressure rules that reference unknown contradictions", () => {
    const middleton = huntersLodgeCase.agents.find((agent) => agent.id === "middleton");
    if (!middleton) {
      throw new Error("Expected middleton agent");
    }

    const result = caseSchema.safeParse({
      ...huntersLodgeCase,
      agents: huntersLodgeCase.agents.map((agent) =>
        agent.id === "middleton"
          ? {
              ...middleton,
              pressureProfile: {
                ...middleton.pressureProfile,
                increaseRules: middleton.pressureProfile.increaseRules.map((rule, index) =>
                  index === 0
                    ? { ...rule, contradictionIds: ["missing-contradiction"] }
                    : rule
                )
              }
            }
          : agent
      )
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Pressure rule contradiction references must match contradiction ids"
        })
      ])
    );
  });

  it("rejects duplicate clue ids", () => {
    expect(() =>
      caseSchema.parse({
        ...huntersLodgeCase,
        clues: [
          huntersLodgeCase.clues[0],
          { ...huntersLodgeCase.clues[1], id: huntersLodgeCase.clues[0].id }
        ]
      })
    ).toThrow();
  });

  it("rejects story events that reference unknown facts", () => {
    const result = caseSchema.safeParse({
      ...huntersLodgeCase,
      storyEvents: [
        ...huntersLodgeCase.storyEvents,
        {
          ...huntersLodgeCase.storyEvents[0],
          id: "event-bad-fact",
          effects: {
            ...huntersLodgeCase.storyEvents[0].effects,
            revealedFactIds: ["missing-fact"]
          }
        }
      ]
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Story event fact references must match fact ids"
        })
      ])
    );
  });

  it("keeps record checks as instant results without story time progression", () => {
    const eventsById = new Map(huntersLodgeCase.storyEvents.map((event) => [event.id, event]));

    expect(eventsById.get("event-verify-roger-alibi")).toMatchObject({
      kind: "instant-result",
      timing: "none"
    });
    expect(eventsById.get("event-check-middleton-agency")).toMatchObject({
      kind: "instant-result",
      timing: "none"
    });
    expect(eventsById.get("event-middleton-vanishes")).toMatchObject({
      kind: "story-beat",
      timing: "story-beat"
    });
  });

  it("rejects duplicate accusation question ids", () => {
    expect(() =>
      caseSchema.parse({
        ...huntersLodgeCase,
        accusation: {
          questions: [
            huntersLodgeCase.accusation.questions[0],
            {
              ...huntersLodgeCase.accusation.questions[1],
              id: huntersLodgeCase.accusation.questions[0].id
            }
          ]
        }
      })
    ).toThrow();
  });

  it("rejects duplicate victim ids", () => {
    const result = caseSchema.safeParse({
      ...huntersLodgeCase,
      victims: [
        huntersLodgeCase.victims[0],
        { ...huntersLodgeCase.victims[0], name: "另一个受害者" }
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
        ...huntersLodgeCase,
        title: "   "
      })
    ).toThrow();

    expect(() =>
      caseSchema.parse({
        ...huntersLodgeCase,
        accusation: {
          questions: [
            {
              ...huntersLodgeCase.accusation.questions[0],
              acceptedAnswers: ["佐伊和罗杰", "   "]
            }
          ]
        }
      })
    ).toThrow();
  });

  it("rejects truth.culprit when not found in agents", () => {
    expect(() =>
      caseSchema.parse({
        ...huntersLodgeCase,
        truth: {
          ...huntersLodgeCase.truth,
          culprit: "unknown"
        }
      })
    ).toThrow();
  });

  it("rejects truth.victim when not found in victims", () => {
    expect(() =>
      caseSchema.parse({
        ...huntersLodgeCase,
        truth: {
          ...huntersLodgeCase.truth,
          victim: "unknown"
        }
      })
    ).toThrow();
  });

  it("keeps the first clue observational rather than revealing the final culprit", () => {
    const firstClue = huntersLodgeCase.clues[0];

    expect(firstClue.text).not.toContain("佐伊");
    expect(firstClue.text).toContain("佩斯");
    expect(firstClue.text).toContain("枪房");
  });
});
