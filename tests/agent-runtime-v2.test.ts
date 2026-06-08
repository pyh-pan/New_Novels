import { describe, expect, it } from "vitest";

import {
  applyAgentResponseContractToState,
  createAgentRuntime,
  evaluateActGates,
  updateSessionForUserMessage
} from "../lib/agent-runtime";
import { loadBundledCase } from "../lib/case/default-case";
import { initialPlayerState } from "../lib/game/play-state";

const huntersLodgeCase = loadBundledCase("hunters-lodge");

describe("agent runtime v2", () => {
  it("uses per-agent pressure profiles generated from case content", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);
    const session = runtime.getSession("middleton");

    const updated = updateSessionForUserMessage({
      runtime,
      session,
      message: "介绍所和交通记录都找不到你，这和你的女管家身份矛盾。",
      playerState: {
        ...initialPlayerState,
        discoveredClueIds: ["clue-agency-denial", "clue-transport-gap"],
        discoveredFactIds: ["fact-agency-denies-middleton", "fact-middleton-no-transport"],
        knownContradictionIds: ["contradiction-middleton-existence"]
      }
    });

    expect(updated.pressureLevel).toBe(6);
    expect(updated.mood).toBe("guarded");
    expect(updated.triggeredPressureRules).toContain("middleton-origin-pressure");
  });

  it("applies structured model response contracts to player state and agent sessions", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);
    const session = runtime.getSession("middleton");
    const result = applyAgentResponseContractToState({
      runtime,
      agentId: "middleton",
      session,
      playerState: initialPlayerState,
      response: {
        reply: "我把黑胡子访客领进枪房。",
        revealedFactIds: ["fact-middleton-visitor-story"],
        suggestedClueIds: ["clue-middleton-testimony"],
        emotionalState: "guarded",
        confidence: 0.8
      }
    });

    expect(result.session.revealedFactIds).toContain("fact-middleton-visitor-story");
    expect(result.playerState.discoveredFactIds).toContain("fact-middleton-visitor-story");
    expect(result.playerState.discoveredClueIds).toContain("clue-middleton-testimony");
    expect(result.session.mood).toBe("guarded");
  });

  it("evaluates act gates from required discoveries and interactions", () => {
    const runtime = createAgentRuntime(huntersLodgeCase);
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
        discoveredClueIds: [
          "clue-middleton-testimony",
          "clue-locked-door-window",
          "clue-missing-revolver",
          "clue-close-shot"
        ],
        discoveredFactIds: [
          "fact-middleton-visitor-story",
          "fact-locked-door-open-window",
          "fact-missing-revolver",
          "fact-close-shot-behind"
        ],
        knownContradictionIds: []
      },
      npcInteractionIds: ["zoe", "middleton", "japp"],
      sceneInteractionIds: ["scene-gun-room:尸体", "scene-gun-room:左轮手枪"]
    });

    expect(unlocked.unlockedGateIds).toContain("gate-opening-to-testimony");
    expect(unlocked.nextActId).toBe("act-testimony");
  });
});
