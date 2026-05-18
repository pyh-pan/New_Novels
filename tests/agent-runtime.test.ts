import { describe, expect, it } from "vitest";

import { hammerOfGodCase } from "../lib/case/hammer-of-god";
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
import type { PlayerKnowledgeState } from "../lib/case/schema";

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
    const runtime = createAgentRuntime(hammerOfGodCase);

    expect(runtime.route("我想问牧师案发时在哪里")).toMatchObject({
      targetId: "wilfred",
      label: "威尔弗里德牧师"
    });
    expect(runtime.route("锤子和伤口有什么矛盾")).toMatchObject({
      targetId: "general",
      label: "调查助手"
    });
  });

  it("builds a locked general context from public and player-unlocked facts only", () => {
    const runtime = createAgentRuntime(hammerOfGodCase);
    const context = buildRuntimeContext({
      runtime,
      agentId: "general",
      playerState: {
        ...emptyPlayerState,
        discoveredClueIds: ["small-hammer"],
        discoveredFactIds: ["fact-small-hammer-weight"]
      }
    });

    expect(context.allowedFactIds).toContain("fact-small-hammer-weight");
    expect(context.allowedFactIds).not.toContain("truth-wilfred-method");
    expect(context.hiddenFactIds).toContain("truth-wilfred-method");
    expect(context.promptVersion).toBe("agent-runtime/v1");
  });

  it("keeps NPC visible facts separate from private and truth facts", () => {
    const runtime = createAgentRuntime(hammerOfGodCase);
    const context = buildRuntimeContext({
      runtime,
      agentId: "wilfred",
      playerState: emptyPlayerState
    });

    expect(context.allowedFactIds).toContain("fact-wilfred-denies-tower");
    expect(context.allowedFactIds).not.toContain("truth-wilfred-method");
    expect(context.privateFactIds).toContain("truth-wilfred-method");
  });

  it("raises pressure when a player confronts an NPC with matching clue topics", () => {
    const runtime = createAgentRuntime(hammerOfGodCase);
    const session = runtime.getSession("wilfred");
    const updated = updateSessionForUserMessage({
      runtime,
      session,
      message: "你说没上钟楼，但小锤和伤口明显不匹配。",
      playerState: {
        ...emptyPlayerState,
        discoveredClueIds: ["small-hammer", "tower-height"],
        discoveredFactIds: ["fact-small-hammer-weight", "fact-tower-overlooks-scene"]
      }
    });

    expect(updated.pressureLevel).toBeGreaterThan(session.pressureLevel);
    expect(updated.lastTopics).toEqual(
      expect.arrayContaining(["钟楼", "小锤", "伤口"])
    );
  });

  it("reveals facts only when clue, topic, pressure, and act conditions are met", () => {
    const runtime = createAgentRuntime(hammerOfGodCase);
    const session = {
      ...runtime.getSession("wilfred"),
      pressureLevel: 3,
      lastTopics: ["钟楼", "小锤"]
    };

    const revealed = evaluateRevealRules({
      runtime,
      agentId: "wilfred",
      session,
      playerState: {
        ...emptyPlayerState,
        discoveredClueIds: ["small-hammer", "tower-height", "wilfred-denial"]
      }
    });

    expect(revealed.map((rule) => rule.factId)).toContain("fact-wilfred-nervous-about-tower");
    expect(revealed.map((rule) => rule.factId)).not.toContain("truth-wilfred-method");
  });

  it("rejects output that leaks disallowed truth facts or fabricates evidence", () => {
    const runtime = createAgentRuntime(hammerOfGodCase);
    const context = buildRuntimeContext({
      runtime,
      agentId: "general",
      playerState: emptyPlayerState
    });

    expect(
      validateAgentOutput({
        runtime,
        context,
        output: "威尔弗里德是真凶，他从钟楼扔下小锤。"
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
    const runtime = createAgentRuntime(hammerOfGodCase);
    const graph = buildPlayerKnowledgeGraph({
      ...emptyPlayerState,
      discoveredClueIds: ["small-hammer", "tower-height"],
      discoveredFactIds: ["fact-small-hammer-weight"],
      hypotheses: ["小锤可能来自高处"]
    });

    expect(graph.clues).toContain("small-hammer");
    expect(graph.facts).toContain("fact-small-hammer-weight");
    expect(graph.hypotheses).toContain("小锤可能来自高处");
    expect(getAgentRelationships(runtime, "elizabeth")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: "simeon", attitude: "protective" })
      ])
    );
  });

  it("accepts structured model response contracts while preserving a plain reply", () => {
    const parsed = parseAgentResponseContract(
      JSON.stringify({
        reply: "我没有上过钟楼。",
        revealedFactIds: ["fact-wilfred-denies-tower"],
        suggestedClueIds: ["wilfred-denial"],
        emotionalState: "guarded",
        confidence: 0.82
      })
    );

    expect(parsed.reply).toBe("我没有上过钟楼。");
    expect(parsed.revealedFactIds).toEqual(["fact-wilfred-denies-tower"]);
    expect(parseAgentResponseContract("普通文本回答").reply).toBe("普通文本回答");
  });
});
