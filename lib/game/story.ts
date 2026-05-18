import { hammerOfGodCase } from "../case/hammer-of-god";

export type StoryChapter = {
  id: string;
  title: string;
  subtitle?: string;
  body: string[];
  previousChapterId?: string;
  nextChapterId?: string;
};

export const storyChapters: StoryChapter[] = hammerOfGodCase.chapters.map((chapter) => ({
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

export function getChapterById(id: string) {
  return storyChapters.find((chapter) => chapter.id === id);
}

export function getPreviousChapter(id: string) {
  const chapter = getChapterById(id);
  return chapter?.previousChapterId
    ? getChapterById(chapter.previousChapterId)
    : undefined;
}

export function getNextChapter(id: string) {
  const chapter = getChapterById(id);
  return chapter?.nextChapterId ? getChapterById(chapter.nextChapterId) : undefined;
}
