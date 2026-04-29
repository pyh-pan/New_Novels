import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import StoryReader from "../components/StoryReader";
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

test("story reader renders a scrollable chapter with bottom navigation", () => {
  const onChapterChange = vi.fn();

  render(<StoryReader currentChapterId="chapter-1" onChapterChange={onChapterChange} />);

  expect(screen.getByRole("heading", { name: "钟楼下的锤击案" })).toBeInTheDocument();
  expect(screen.getByText("第一章 案发现场")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "前一章" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "后一章" }));
  expect(onChapterChange).toHaveBeenCalledWith("chapter-2");
});

test("clicking the story reader reveals floating chapter controls", () => {
  render(<StoryReader currentChapterId="chapter-1" onChapterChange={vi.fn()} />);

  expect(screen.queryByLabelText("章节快捷导航")).not.toBeInTheDocument();

  fireEvent.click(screen.getByLabelText("故事阅读区"));
  expect(screen.getByLabelText("章节快捷导航")).toBeInTheDocument();
});
