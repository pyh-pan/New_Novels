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
    expect(state.currentChapterId).toBe("chapter-1");
    expect(state.conversations[0]?.targetId).toBe("general");
    expect(state.notes).toEqual([]);
    expect(state.ui.activeNotebookFilter).toBe("all");
    expect(PLAY_STATE_STORAGE_KEY).toBe("new-novels.play-state.v1");
  });

  test("normalizes partial saved state without losing valid data", () => {
    const normalized = normalizePlayState({
      version: 1,
      currentChapterId: "chapter-2",
      notes: [
        {
          id: "note-1",
          title: "旧笔记",
          text: "正文",
          tag: "clue",
          source: "调查助手"
        }
      ],
      ui: { activeNotebookFilter: "clue", mobileTab: "notebook" }
    });

    expect(normalized.currentChapterId).toBe("chapter-2");
    expect(normalized.notes[0]).toMatchObject({
      id: "note-1",
      title: "旧笔记",
      tag: "clue"
    });
    expect(normalized.notes[0]?.createdAt).toEqual(expect.any(String));
    expect(normalized.ui.activeNotebookFilter).toBe("clue");
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
      currentChapterId: "chapter-1"
    });
  });
});
