import type { StoryChapter as CaseStoryChapter } from "../case/schema";

export type StoryChapter = {
  id: string;
  title: string;
  subtitle?: string;
  body: string[];
  previousChapterId?: string;
  nextChapterId?: string;
};

export function toStoryChapters(chapters: CaseStoryChapter[]): StoryChapter[] {
  return chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    subtitle: chapter.subtitle,
    body: chapter.body
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    previousChapterId: chapter.previousChapterId,
    nextChapterId: chapter.nextChapterId
  }));
}

export function getChapterById(chapters: StoryChapter[], id: string) {
  return chapters.find((chapter) => chapter.id === id);
}

export function getPreviousChapter(chapters: StoryChapter[], id: string) {
  const chapter = getChapterById(chapters, id);
  return chapter?.previousChapterId
    ? getChapterById(chapters, chapter.previousChapterId)
    : undefined;
}

export function getNextChapter(chapters: StoryChapter[], id: string) {
  const chapter = getChapterById(chapters, id);
  return chapter?.nextChapterId ? getChapterById(chapters, chapter.nextChapterId) : undefined;
}
