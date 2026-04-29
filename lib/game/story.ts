import { hammerOfGodCase } from "../case/hammer-of-god";

export type StoryChapter = {
  id: string;
  title: string;
  subtitle?: string;
  body: string[];
  previousChapterId?: string;
  nextChapterId?: string;
};

const openingParagraphs = hammerOfGodCase.storyText
  .split(/\n\s*\n/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean);

export const storyChapters: StoryChapter[] = [
  {
    id: "chapter-1",
    title: hammerOfGodCase.title,
    subtitle: "第一章 案发现场",
    body: openingParagraphs,
    nextChapterId: "chapter-2"
  },
  {
    id: "chapter-2",
    title: hammerOfGodCase.title,
    subtitle: "第二章 证词的阴影",
    previousChapterId: "chapter-1",
    body: [
      "威尔弗里德坚持自己从未登上钟楼。铁匠西米恩沉默得像一块铁，只在被问及那把小锤时说，它太轻了。",
      "伊丽莎白提到诺曼时明显迟疑。疯乔则在教堂附近看见过高处的人影，却不愿承认自己当时为什么在那里。"
    ]
  }
];

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
