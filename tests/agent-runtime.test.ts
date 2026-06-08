import { describe, expect, it } from "vitest";

import {
  buildPlayerKnowledgeGraph,
  buildRuntimeContext,
  createAgentRuntime,
  evaluateRevealRules,
  getAgentRelationships,
  parseAgentResponseContract,
  updateSessionForUserMessage,
  validateAgentOutput
} from "../lib/agent-runtime";
import { loadBundledCase } from "../lib/case/default-case";
import type { PlayerKnowledgeState } from "../lib/case/schema";

const huntersLodgeCase = loadBundledCase("hunters-lodge");

const emptyPlayerState: PlayerKnowledgeState = {
  currentActId: "act-opening",
  discoveredClueIds: [],
  discoveredFactIds: [],
  heardTestimonyIds: [],
  knownContradictionIds: [],
  confrontedAgentIds: [],
  askedTopics: [],
  hypotheses: []
};

describe("agent runtime", () => {
  it("routes aliases through the registry instead of hard-coded npc switches", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);

    expect(runtime.route("我想问米德尔顿太太案发时在哪里")).toMatchObject({
      targetId: "middleton",
      label: "米德尔顿太太"
    });
    expect(runtime.route("左轮和窗户有什么矛盾")).toMatchObject({
      targetId: "general",
      label: "调查助手"
    });
  });

  it("builds a locked general context from public and player-unlocked facts only", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);
    const context = buildRuntimeContext({
      runtime,
      agentId: "general",
      playerState: {
        ...emptyPlayerState,
        discoveredClueIds: ["clue-missing-revolver"],
        discoveredFactIds: ["fact-missing-revolver"]
      }
    });

    expect(context.allowedFactIds).toContain("fact-missing-revolver");
    expect(context.allowedFactIds).not.toContain("fact-zoe-shot-pace");
    expect(context.hiddenFactIds).toContain("fact-zoe-shot-pace");
    expect(context.promptVersion).toBe("agent-runtime/v1");
  });

  it("keeps NPC visible facts separate from private and truth facts", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);
    const context = buildRuntimeContext({
      runtime,
      agentId: "middleton",
      playerState: emptyPlayerState
    });

    expect(context.allowedFactIds).toContain("fact-middleton-visitor-story");
    expect(context.allowedFactIds).not.toContain("fact-middleton-fiction");
    expect(context.privateFactIds).toContain("fact-middleton-fiction");
  });

  it("raises pressure when a player confronts an NPC with matching clue topics", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);
    const session = runtime.getSession("middleton");
    const updated = updateSessionForUserMessage({
      runtime,
      session,
      message: "你说自己是女管家，但介绍所和交通记录都对不上。",
      playerState: {
        ...emptyPlayerState,
        discoveredClueIds: ["clue-agency-denial", "clue-transport-gap"],
        discoveredFactIds: ["fact-agency-denies-middleton", "fact-middleton-no-transport"],
        knownContradictionIds: ["contradiction-middleton-existence"]
      }
    });

    expect(updated.pressureLevel).toBeGreaterThan(session.pressureLevel);
    expect(updated.lastTopics).toEqual(
      expect.arrayContaining(["介绍所", "交通", "女管家"])
    );
  });

  it("reveals facts only when clue, topic, pressure, and act conditions are met", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);
    const session = {
      ...runtime.getSession("middleton"),
      pressureLevel: 6,
      lastTopics: ["访客", "黑胡子"]
    };

    const revealed = evaluateRevealRules({
      runtime,
      agentId: "middleton",
      session,
      playerState: {
        ...emptyPlayerState,
        discoveredClueIds: ["clue-middleton-testimony"]
      }
    });

    expect(revealed.map((rule) => rule.factId)).toContain("fact-middleton-visitor-story");
    expect(revealed.map((rule) => rule.factId)).not.toContain("fact-middleton-fiction");
  });

  it("rejects output that leaks disallowed truth facts or fabricates evidence", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);
    const context = buildRuntimeContext({
      runtime,
      agentId: "general",
      playerState: emptyPlayerState
    });

    expect(
      validateAgentOutput({
        runtime,
        context,
        output: "所谓米德尔顿太太并不是独立存在的证人，而是佐伊伪装出的身份。"
      }).ok
    ).toBe(false);

    expect(
      validateAgentOutput({
        runtime,
        context,
        output: "现场还有一封新书信能证明另有目击者。"
      }).ok
    ).toBe(false);
  });

  it("builds player knowledge and cross-agent relationship views", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);
    const graph = buildPlayerKnowledgeGraph({
      ...emptyPlayerState,
      discoveredClueIds: ["clue-missing-revolver", "clue-ealing-revolver"],
      discoveredFactIds: ["fact-missing-revolver"],
      hypotheses: ["伊灵左轮可能是假线索"]
    });

    expect(graph.clues).toContain("clue-missing-revolver");
    expect(graph.facts).toContain("fact-missing-revolver");
    expect(graph.hypotheses).toContain("伊灵左轮可能是假线索");
    expect(getAgentRelationships(runtime, "roger")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: "zoe", attitude: "protective" })
      ])
    );
  });

  it("accepts structured model response contracts while preserving a plain reply", () => {
    const parsed = parseAgentResponseContract(
      JSON.stringify({
        reply: "我只是按吩咐把访客领进枪房。",
        revealedFactIds: ["fact-middleton-visitor-story"],
        suggestedClueIds: ["clue-middleton-testimony"],
        emotionalState: "guarded",
        confidence: 0.82
      })
    );

    expect(parsed.reply).toBe("我只是按吩咐把访客领进枪房。");
    expect(parsed.revealedFactIds).toEqual(["fact-middleton-visitor-story"]);
    expect(parseAgentResponseContract("普通文本回答").reply).toBe("普通文本回答");
  });
});
