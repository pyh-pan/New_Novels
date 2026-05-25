import { describe, expect, it } from "vitest";

import {
  applyAgentResponseContractToState,
  createAgentRuntime,
  evaluateActGates,
  updateSessionForUserMessage
} from "../lib/agent-runtime";
import { hammerOfGodCase } from "../lib/case/hammer-of-god";
import { initialPlayerState } from "../lib/game/play-state";

describe("agent runtime v2", () => {
  it("uses per-agent pressure profiles generated from case content", () => {
    const runtime = createAgentRuntime(hammerOfGodCase);
    const session = runtime.getSession("wilfred");

    const updated = updateSessionForUserMessage({
      runtime,
      session,
      message: "你说没上钟楼，但小锤和伤口的矛盾只能由高处解释。",
      playerState: {
        ...initialPlayerState,
        discoveredClueIds: ["small-hammer", "tower-height"],
        discoveredFactIds: ["fact-small-hammer-weight", "fact-tower-overlooks-scene"],
        knownContradictionIds: ["contradiction-hammer-force"]
      }
    });

    expect(updated.pressureLevel).toBe(3);
    expect(updated.mood).toBe("guarded");
    expect(updated.triggeredPressureRules).toContain("wilfred-tower-contradiction");
  });

  it("applies structured model response contracts to player state and agent sessions", () => {
    const runtime = createAgentRuntime(hammerOfGodCase);
    const session = runtime.getSession("wilfred");
    const result = applyAgentResponseContractToState({
      runtime,
      agentId: "wilfred",
      session,
      playerState: initialPlayerState,
      response: {
        reply: "我只是在下面祈祷。",
        revealedFactIds: ["fact-wilfred-denies-tower"],
        suggestedClueIds: ["wilfred-denial"],
        emotionalState: "guarded",
        confidence: 0.8
      }
    });

    expect(result.session.revealedFactIds).toContain("fact-wilfred-denies-tower");
    expect(result.playerState.discoveredFactIds).toContain("fact-wilfred-denies-tower");
    expect(result.playerState.discoveredClueIds).toContain("wilfred-denial");
    expect(result.session.mood).toBe("guarded");
  });

  it("evaluates act gates from required discoveries and interactions", () => {
    const runtime = createAgentRuntime(hammerOfGodCase);
    const locked = evaluateActGates({
      runtime,
      playerState: initialPlayerState,
      npcInteractionIds: [],
      sceneInteractionIds: []
    });

    expect(locked.unlockedGateIds).not.toContain("gate-opening-to-testimony");

    const unlocked = evaluateActGates({
      runtime,
      playerState: {
        ...initialPlayerState,
        discoveredClueIds: ["small-hammer", "tower-height"],
        discoveredFactIds: ["fact-small-hammer-weight", "fact-tower-overlooks-scene"],
        knownContradictionIds: ["contradiction-hammer-force"]
      },
      npcInteractionIds: ["general"],
      sceneInteractionIds: ["scene-smithy-road:small-hammer"]
    });

    expect(unlocked.unlockedGateIds).toContain("gate-opening-to-testimony");
    expect(unlocked.nextActId).toBe("act-testimony");
  });
});
