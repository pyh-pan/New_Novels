import { describe, expect, test } from "vitest";
import {
  createInitialPlayState,
  normalizePlayState,
  PLAY_STATE_STORAGE_KEY,
  serializePlayState
} from "../lib/game/play-state";

describe("play state persistence", () => {
  test("creates a versioned initial play state", () => {
    const state = createInitialPlayState();

    expect(state.version).toBe(1);
    expect(state.caseId).toBe("hunters-lodge");
    expect(state.currentChapterId).toBe("chapter-1");
    expect(state.conversations[0]?.targetId).toBe("general");
    expect(state.conversations[0]?.messages).toEqual([]);
    expect(state.agentSessions).toEqual({});
    expect(state.notes).toEqual([]);
    expect(state.ui.activeNotebookFilter).toBe("all");
    expect(state.ui.investigationOpen).toBe(false);
    expect(state.ui.investigationWidth).toBe(380);
    expect(state.ui.notebookOpen).toBe(false);
    expect(state.ui.notebookWidth).toBe(340);
    expect(PLAY_STATE_STORAGE_KEY).toBe("new-novels.play-state.v1");
  });

  test("removes the legacy general opening message from saved conversations", () => {
    const normalized = normalizePlayState({
      version: 1,
      caseId: "hunters-lodge",
      conversations: [
        {
          id: "general",
          targetId: "general",
          title: "调查助手",
          isExpanded: true,
          messages: [
            {
              id: "general-opening",
              role: "assistant",
              content:
                "我会基于你已掌握的信息协助调查；如果问题更适合某位人物，我会把对话转到对应 NPC。"
            },
            {
              id: "user-1",
              role: "user",
              content: "现场有什么异常？"
            }
          ]
        }
      ]
    });

    expect(normalized.conversations[0]?.messages).toEqual([
      {
        id: "user-1",
        role: "user",
        content: "现场有什么异常？"
      }
    ]);
  });

  test("normalizes partial saved state without losing valid data", () => {
    const normalized = normalizePlayState({
      version: 1,
      caseId: "hunters-lodge",
      currentChapterId: "chapter-2",
      agentSessions: {
        wilfred: {
          caseId: "hammer-of-god",
          agentId: "wilfred",
          conversationId: "wilfred",
          pressureLevel: 3,
          revealedFactIds: ["fact-wilfred-denies-tower"],
          lastTopics: ["钟楼"],
          triggeredPressureRules: ["wilfred-tower-contradiction"],
          currentActAgentState: "guarded",
          mood: "guarded"
        }
      },
      notes: [
        {
          id: "note-1",
          title: "旧笔记",
          text: "正文",
          tag: "clue",
          source: "调查助手"
        }
      ],
      ui: {
        activeNotebookFilter: "clue",
        investigationOpen: true,
        investigationWidth: 999,
        notebookOpen: true,
        notebookWidth: 120,
        mobileTab: "notebook"
      }
    });

    expect(normalized.currentChapterId).toBe("chapter-2");
    expect(normalized.agentSessions.wilfred?.pressureLevel).toBe(3);
    expect(normalized.agentSessions.wilfred?.mood).toBe("guarded");
    expect(normalized.notes[0]).toMatchObject({
      id: "note-1",
      title: "旧笔记",
      tag: "clue"
    });
    expect(normalized.notes[0]?.createdAt).toEqual(expect.any(String));
    expect(normalized.ui.activeNotebookFilter).toBe("clue");
    expect(normalized.ui.investigationOpen).toBe(true);
    expect(normalized.ui.investigationWidth).toBe(560);
    expect(normalized.ui.notebookOpen).toBe(true);
    expect(normalized.ui.notebookWidth).toBe(300);
    expect(normalized.ui.mobileTab).toBe("notebook");
  });

  test("invalid saved state falls back to initial state", () => {
    const normalized = normalizePlayState("{ broken json");

    expect(normalized.currentChapterId).toBe("chapter-1");
    expect(normalized.notes).toEqual([]);
  });

  test("serializes valid state as JSON", () => {
    const serialized = serializePlayState(createInitialPlayState());

    expect(JSON.parse(serialized)).toMatchObject({
      version: 1,
      caseId: "hunters-lodge",
      currentChapterId: "chapter-1"
    });
  });

  test("resets saved state when switching cases", () => {
    const normalized = normalizePlayState({
      version: 1,
      caseId: "hammer-of-god",
      currentChapterId: "chapter-2",
      notes: [{ id: "old", title: "旧案", text: "正文", tag: "clue" }]
    });

    expect(normalized.caseId).toBe("hunters-lodge");
    expect(normalized.currentChapterId).toBe("chapter-1");
    expect(normalized.notes).toEqual([]);
  });
});
