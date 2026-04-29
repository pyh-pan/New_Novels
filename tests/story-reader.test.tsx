import "@testing-library/jest-dom/vitest";
import {
  getChapterById,
  getNextChapter,
  getPreviousChapter,
  storyChapters
} from "../lib/game/story";

test("story chapters expose ordered navigation", () => {
  expect(storyChapters.length).toBeGreaterThanOrEqual(1);

  const first = getChapterById("chapter-1");

  expect(first?.title).toBe("钟楼下的锤击案");
  expect(getPreviousChapter("chapter-1")).toBeUndefined();
  expect(getNextChapter("chapter-1")?.id).toBe("chapter-2");
});
