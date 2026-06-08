"use client";

import { FormEvent, MouseEvent as ReactMouseEvent, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export type SelectionCommentPayload = {
  quote: string;
  comment: string;
  source: string;
};

export type SelectionCommentTarget = {
  quote: string;
  source: string;
  x: number;
  y: number;
  range?: Range;
};

const COMMENT_ACTIVE_HIGHLIGHT_NAME = "comment-selection";
const COMMENT_SAVED_HIGHLIGHT_NAME = "comment-annotations";
const COMMENT_HIGHLIGHT_STYLE_ID = "selection-comment-highlight-style";
const savedCommentRanges: Range[] = [];
const savedCommentAnnotations: SavedSelectionComment[] = [];

type SavedSelectionComment = SelectionCommentPayload & {
  id: string;
  range: Range;
};

type HighlightRegistry = {
  set: (name: string, highlight: unknown) => void;
  delete: (name: string) => void;
};

type HighlightWindow = Window &
  typeof globalThis & {
    Highlight?: new (...ranges: Range[]) => unknown;
    CSS?: {
      highlights?: HighlightRegistry;
    };
  };

function ensureSelectionHighlightStyle() {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(COMMENT_HIGHLIGHT_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = COMMENT_HIGHLIGHT_STYLE_ID;
  style.textContent = `
    ::highlight(${COMMENT_ACTIVE_HIGHLIGHT_NAME}),
    ::highlight(${COMMENT_SAVED_HIGHLIGHT_NAME}) {
      background: rgba(196, 174, 126, 0.28);
      color: inherit;
    }
  `;
  document.head.appendChild(style);
}

function setHighlightRanges(name: string, ranges: Range[]) {
  if (typeof window === "undefined") {
    return;
  }

  const highlightWindow = window as HighlightWindow;
  const registry = highlightWindow.CSS?.highlights;
  const HighlightConstructor = highlightWindow.Highlight;

  if (!registry || !HighlightConstructor) {
    return;
  }

  ensureSelectionHighlightStyle();
  registry.delete(name);
  if (ranges.length > 0) {
    registry.set(name, new HighlightConstructor(...ranges.map((range) => range.cloneRange())));
  }
}

export function setSelectionCommentHighlight(range: Range | null) {
  setHighlightRanges(COMMENT_ACTIVE_HIGHLIGHT_NAME, range ? [range] : []);
}

export function persistSelectionCommentHighlight(
  range: Range | undefined,
  payload?: SelectionCommentPayload
) {
  if (!range) {
    return;
  }

  const savedRange = range.cloneRange();
  savedCommentRanges.push(savedRange);
  if (payload) {
    savedCommentAnnotations.push({
      id: `annotation-${Date.now()}-${savedCommentAnnotations.length}`,
      range,
      ...payload
    });
  }
  setHighlightRanges(COMMENT_SAVED_HIGHLIGHT_NAME, savedCommentRanges);
}

function findTextRange(container: HTMLElement, quote: string) {
  const trimmedQuote = quote.trim();
  if (!trimmedQuote) {
    return null;
  }

  const nodes: Array<{ node: Text; start: number; end: number }> = [];
  let fullText = "";
  const walker = document.createTreeWalker(container, 4);
  let currentNode = walker.nextNode();

  while (currentNode) {
    if (currentNode instanceof Text) {
      const text = currentNode.textContent ?? "";
      nodes.push({
        node: currentNode,
        start: fullText.length,
        end: fullText.length + text.length
      });
      fullText += text;
    }
    currentNode = walker.nextNode();
  }

  const start = fullText.indexOf(trimmedQuote);
  if (start < 0) {
    return null;
  }

  const end = start + trimmedQuote.length;
  const startNode = nodes.find((entry) => start >= entry.start && start <= entry.end);
  const endNode = nodes.find((entry) => end >= entry.start && end <= entry.end);
  if (!startNode || !endNode) {
    return null;
  }

  const range = document.createRange();
  range.setStart(startNode.node, start - startNode.start);
  range.setEnd(endNode.node, end - endNode.start);
  return range;
}

export function restoreSelectionCommentHighlights(
  containers: HTMLElement[],
  annotations: SelectionCommentPayload[],
  source: string
) {
  for (let index = savedCommentAnnotations.length - 1; index >= 0; index -= 1) {
    if (savedCommentAnnotations[index].source === source) {
      savedCommentAnnotations.splice(index, 1);
      savedCommentRanges.splice(index, 1);
    }
  }

  annotations.forEach((annotation) => {
    const range = containers
      .map((container) => findTextRange(container, annotation.quote))
      .find((candidate): candidate is Range => Boolean(candidate));

    if (!range) {
      return;
    }

    const savedRange = range.cloneRange();
    savedCommentRanges.push(savedRange);
    savedCommentAnnotations.push({
      id: `annotation-${annotation.source}-${savedCommentAnnotations.length}`,
      range: savedRange,
      ...annotation
    });
  });

  setHighlightRanges(COMMENT_SAVED_HIGHLIGHT_NAME, savedCommentRanges);
}

function pointInRange(range: Range, x: number, y: number) {
  if (typeof range.getClientRects !== "function") {
    return false;
  }

  const rects = Array.from(range.getClientRects());
  return rects.some(
    (rect) =>
      x >= rect.left - 3 &&
      x <= rect.right + 3 &&
      y >= rect.top - 3 &&
      y <= rect.bottom + 3
  );
}

function findAnnotationAtPoint(x: number, y: number) {
  for (let index = savedCommentAnnotations.length - 1; index >= 0; index -= 1) {
    const annotation = savedCommentAnnotations[index];
    if (pointInRange(annotation.range, x, y)) {
      return annotation;
    }
  }

  return null;
}

export function getSelectionWithin(container: HTMLElement) {
  if (typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }

  const { anchorNode, focusNode } = selection;
  if (!anchorNode || !focusNode) {
    return null;
  }

  if (!container.contains(anchorNode) || !container.contains(focusNode)) {
    return null;
  }

  const quote = selection.toString().replace(/\s+/g, " ").trim();
  if (quote.length < 2) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (!rect.width && !rect.height) {
    return null;
  }

  return {
    quote,
    range: range.cloneRange(),
    x: Math.min(Math.max(rect.left + rect.width / 2, 180), window.innerWidth - 180),
    y: Math.max(rect.top - 12, 18)
  };
}

interface SelectionCommentPopoverProps {
  target: SelectionCommentTarget | null;
  onSubmit: (payload: SelectionCommentPayload) => void;
  onClose: () => void;
}

export default function SelectionCommentPopover({
  target,
  onSubmit,
  onClose
}: SelectionCommentPopoverProps) {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft("");
    setSelectionCommentHighlight(target?.range ?? null);

    return () => setSelectionCommentHighlight(null);
  }, [target]);

  if (!target) {
    return null;
  }

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const comment = draft.trim();
    if (!comment) {
      return;
    }

    const payload = {
      quote: target.quote,
      comment,
      source: target.source
    };
    persistSelectionCommentHighlight(target.range, payload);
    onSubmit(payload);
    window.getSelection()?.removeAllRanges();
    onClose();
  };

  return (
    <form
      className="selection-comment-popover"
      style={{ left: target.x, top: target.y }}
      onSubmit={submitComment}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      aria-label="选中文本批注"
    >
      <div className="selection-comment-row">
        <textarea
          value={draft}
          aria-label="批注内容"
          placeholder="记录你的想法"
          rows={3}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" aria-label="发送批注" disabled={!draft.trim()}>
          <Icon name="send" />
        </button>
        <button type="button" aria-label="关闭批注框" onClick={onClose}>
          <Icon name="x" />
        </button>
      </div>
    </form>
  );
}

export function SelectionAnnotationPreview() {
  const [preview, setPreview] = useState<{
    annotation: SavedSelectionComment;
    x: number;
    y: number;
    pinned: boolean;
  } | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (preview?.pinned) {
        return;
      }

      if (
        event.target instanceof HTMLElement &&
        event.target.closest(".selection-annotation-preview")
      ) {
        return;
      }

      const annotation = findAnnotationAtPoint(event.clientX, event.clientY);
      setPreview(
        annotation
          ? {
              annotation,
              x: Math.min(Math.max(event.clientX + 14, 190), window.innerWidth - 190),
              y: Math.max(event.clientY - 12, 18),
              pinned: false
            }
          : null
      );
    };

    const handleClick = (event: MouseEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest(".selection-annotation-preview")
      ) {
        return;
      }

      const annotation = findAnnotationAtPoint(event.clientX, event.clientY);
      setPreview(
        annotation
          ? {
              annotation,
              x: Math.min(Math.max(event.clientX + 14, 190), window.innerWidth - 190),
              y: Math.max(event.clientY - 12, 18),
              pinned: true
            }
          : null
      );
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("click", handleClick);
    };
  }, [preview?.pinned]);

  if (!preview) {
    return null;
  }

  const closePreview = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setPreview(null);
  };

  return (
    <div
      ref={previewRef}
      className={`selection-annotation-preview ${preview.pinned ? "is-pinned" : ""}`}
      style={{ left: preview.x, top: preview.y }}
      role="dialog"
      aria-label="批注内容"
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="selection-annotation-header">
        <span>{preview.annotation.source}</span>
        <button type="button" aria-label="关闭批注内容" onClick={closePreview}>
          <Icon name="x" />
        </button>
      </div>
      <p>{preview.annotation.comment}</p>
    </div>
  );
}
