"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getChapterById,
  getNextChapter,
  getPreviousChapter
} from "../lib/game/story";
import { prepareChapterLayout } from "../lib/reading/pretext-layout";

type StoryReaderProps = {
  currentChapterId: string;
  onChapterChange: (chapterId: string) => void;
};

export default function StoryReader({
  currentChapterId,
  onChapterChange
}: StoryReaderProps) {
  const chapter = getChapterById(currentChapterId) ?? getChapterById("chapter-1");
  const previous = chapter ? getPreviousChapter(chapter.id) : undefined;
  const next = chapter ? getNextChapter(chapter.id) : undefined;
  const [navVisible, setNavVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const layoutMeta = useMemo(() => {
    return prepareChapterLayout(chapter?.body ?? [], 680, 34);
  }, [chapter]);

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  if (!chapter) {
    return null;
  }

  const showFloatingNav = () => {
    setNavVisible(true);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => setNavVisible(false), 2800);
  };

  return (
    <section
      className="story-pane story-reader"
      aria-labelledby="case-title"
      aria-label="故事阅读区"
      onClick={showFloatingNav}
      data-pretext-lines={layoutMeta.lineCount}
      data-pretext-fallback={layoutMeta.failed ? "true" : "false"}
    >
      {navVisible ? (
        <div className="floating-chapter-nav" aria-label="章节快捷导航">
          <button
            type="button"
            disabled={!previous}
            onClick={(event) => {
              event.stopPropagation();
              if (previous) onChapterChange(previous.id);
            }}
          >
            前一章
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={(event) => {
              event.stopPropagation();
              if (next) onChapterChange(next.id);
            }}
          >
            后一章
          </button>
        </div>
      ) : null}

      <div className="story-header">
        <p className="story-source">The Hammer of God</p>
        <h1 id="case-title">{chapter.title}</h1>
        {chapter.subtitle ? <p className="story-chapter">{chapter.subtitle}</p> : null}
      </div>

      <div className="story-text">
        {chapter.body.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <nav className="chapter-nav" aria-label="章节导航">
        <button
          type="button"
          disabled={!previous}
          onClick={(event) => {
            event.stopPropagation();
            if (previous) onChapterChange(previous.id);
          }}
        >
          前一章
        </button>
        <button
          type="button"
          disabled={!next}
          onClick={(event) => {
            event.stopPropagation();
            if (next) onChapterChange(next.id);
          }}
        >
          后一章
        </button>
      </nav>
    </section>
  );
}
