"use client";

import { useRef, useState } from "react";
import SelectionCommentPopover, {
  getSelectionWithin,
  type SelectionCommentPayload,
  type SelectionCommentTarget
} from "./SelectionCommentPopover";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface ConversationModuleProps {
  id: string;
  title: string;
  subtitle?: string;
  stateLabel?: string;
  isExpanded: boolean;
  isLoading?: boolean;
  messages: ConversationMessage[];
  onToggle: () => void;
  onCommentSelection: (payload: SelectionCommentPayload) => void;
}

export default function ConversationModule({
  id,
  title,
  stateLabel,
  isExpanded,
  isLoading = false,
  messages,
  onToggle,
  onCommentSelection
}: ConversationModuleProps) {
  const panelId = `${id}-conversation-panel`;
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const [commentTarget, setCommentTarget] = useState<SelectionCommentTarget | null>(null);

  const handleMessageMouseUp = () => {
    window.setTimeout(() => {
      if (!messageListRef.current) {
        return;
      }

      const selection = getSelectionWithin(messageListRef.current);
      if (!selection) {
        setCommentTarget(null);
        return;
      }

      setCommentTarget({
        ...selection,
        source: `${title} · 对话`
      });
    }, 0);
  };

  return (
    <article className={`conversation-module ${isExpanded ? "is-expanded" : ""}`}>
      <button
        type="button"
        className="module-header"
        aria-expanded={isExpanded}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <span>
          <strong>{title}</strong>
          {stateLabel ? <small>{stateLabel}</small> : null}
        </span>
        <span className="module-meta" aria-hidden="true">
          {messages.length} 条
          <span className="module-toggle">{isExpanded ? "⌄" : "›"}</span>
        </span>
      </button>

      {isExpanded && (messages.length > 0 || isLoading) ? (
        <div className="module-body" id={panelId}>
          <SelectionCommentPopover
            target={commentTarget}
            onClose={() => setCommentTarget(null)}
            onSubmit={onCommentSelection}
          />
          <div
            className="message-list"
            ref={messageListRef}
            onMouseUp={handleMessageMouseUp}
          >
            {messages.map((message) => (
                <div
                  className={`message-bubble message-${message.role}`}
                  key={message.id}
                >
                  <p>{message.content}</p>
                </div>
              ))}
            {isLoading ? (
              <div className="message-bubble message-assistant">
                <p>正在整理回答...</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}
