import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import StoryReader from "../components/StoryReader";
import {
  getChapterById,
  getNextChapter,
  getPreviousChapter,
  toStoryChapters
} from "../lib/game/story";
import { getDefaultCase } from "../lib/case/default-case";

const caseFile = getDefaultCase();
const storyChapters = toStoryChapters(caseFile.chapters);

test("story chapters expose ordered navigation", () => {
  expect(storyChapters.length).toBeGreaterThanOrEqual(1);

  const first = getChapterById(storyChapters, "chapter-1");

  expect(first?.title).toBe("猎人小屋疑案");
  expect(getPreviousChapter(storyChapters, "chapter-1")).toBeUndefined();
  expect(getNextChapter(storyChapters, "chapter-1")?.id).toBe("chapter-2");
});

test("story reader renders a scrollable chapter with bottom navigation", () => {
  const onChapterChange = vi.fn();

  render(
    <StoryReader
      sourceTitle={caseFile.source.title}
      storyTitle={caseFile.title}
      chapters={storyChapters}
      currentChapterId="chapter-1"
      onChapterChange={onChapterChange}
    />
  );

  expect(screen.getByRole("heading", { name: "第一章 病榻上的委托" })).toBeInTheDocument();
  expect(screen.getByText("猎人小屋疑案")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "前一章" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "后一章" }));
  expect(onChapterChange).toHaveBeenCalledWith("chapter-2");
});

test("clicking the story reader reveals floating chapter controls", async () => {
  render(
    <StoryReader
      sourceTitle={caseFile.source.title}
      storyTitle={caseFile.title}
      chapters={storyChapters}
      currentChapterId="chapter-1"
      onChapterChange={vi.fn()}
    />
  );

  expect(screen.queryByLabelText("章节快捷导航")).not.toBeInTheDocument();

  fireEvent.mouseUp(screen.getByLabelText("故事阅读区"));
  await waitFor(() => {
    expect(screen.getByLabelText("章节快捷导航")).toBeInTheDocument();
  });
  expect(screen.getByLabelText("章节快捷导航")).toHaveAttribute("data-overlay", "true");
});
