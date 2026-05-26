"use client";

import { type CSSProperties, type MouseEvent, useEffect, useRef, useState } from "react";
import SelectionCommentPopover, {
  getSelectionWithin,
  type SelectionCommentPayload,
  type SelectionCommentTarget
} from "./SelectionCommentPopover";
import {
  getChapterById,
  getNextChapter,
  getPreviousChapter,
  type StoryChapter
} from "../lib/game/story";
import { prepareChapterLayout } from "../lib/reading/pretext-layout";

type StoryReaderProps = {
  sourceTitle: string;
  storyTitle?: string;
  chapters: StoryChapter[];
  currentChapterId: string;
  onChapterChange: (chapterId: string) => void;
  onCommentSelection?: (payload: SelectionCommentPayload) => void;
};

export default function StoryReader({
  sourceTitle,
  storyTitle,
  chapters,
  currentChapterId,
  onChapterChange,
  onCommentSelection
}: StoryReaderProps) {
  const chapter =
    getChapterById(chapters, currentChapterId) ?? getChapterById(chapters, "chapter-1");
  const previous = chapter ? getPreviousChapter(chapters, chapter.id) : undefined;
  const next = chapter ? getNextChapter(chapters, chapter.id) : undefined;
  const [navVisible, setNavVisible] = useState(false);
  const [navStyle, setNavStyle] = useState<CSSProperties | undefined>();
  const [commentTarget, setCommentTarget] = useState<SelectionCommentTarget | null>(null);
  const [layoutMeta, setLayoutMeta] = useState(() => ({
    lineCount: chapter?.body.length ?? 0,
    failed: true
  }));
  const readerRef = useRef<HTMLElement | null>(null);
  const storyTextRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLayoutMeta(prepareChapterLayout(chapter?.body ?? [], 680, 34));
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
    const rect = readerRef.current?.getBoundingClientRect();
    if (rect) {
      setNavStyle({
        left: rect.left + rect.width / 2,
        top: Math.max(rect.top + 14, 72),
        width: Math.min(Math.max(rect.width - 32, 260), 520)
      });
    }
    setNavVisible(true);
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => setNavVisible(false), 2800);
  };

  const handleReaderMouseUp = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button, input, textarea, select, a")) {
      return;
    }

    window.setTimeout(() => {
      const selection = storyTextRef.current
        ? getSelectionWithin(storyTextRef.current)
        : null;

      if (selection && onCommentSelection) {
        setNavVisible(false);
        setCommentTarget({
          ...selection,
          source: `${storyTitle ?? sourceTitle} · ${chapter.subtitle ?? chapter.title}`
        });
        return;
      }

      setCommentTarget(null);
      showFloatingNav();
    }, 0);
  };

  return (
    <section
      ref={readerRef}
      className="story-pane story-reader"
      aria-labelledby="case-title"
      aria-label="故事阅读区"
      onMouseUp={handleReaderMouseUp}
      data-pretext-lines={layoutMeta.lineCount}
      data-pretext-fallback={layoutMeta.failed ? "true" : "false"}
    >
      <SelectionCommentPopover
        target={commentTarget}
        onClose={() => setCommentTarget(null)}
        onSubmit={(payload) => onCommentSelection?.(payload)}
      />

      {navVisible ? (
        <div
          className="floating-chapter-nav"
          style={navStyle}
          aria-label="章节快捷导航"
          data-overlay="true"
        >
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
          <span>{chapter.subtitle ?? "当前章节"}</span>
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
        <p className="story-source">{storyTitle ?? sourceTitle}</p>
        <h1 id="case-title">{chapter.subtitle ?? chapter.title}</h1>
      </div>

      <div className="story-text" ref={storyTextRef}>
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
