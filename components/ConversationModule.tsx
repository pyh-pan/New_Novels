"use client";

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface ConversationModuleProps {
  id: string;
  title: string;
  subtitle?: string;
  isExpanded: boolean;
  isLoading?: boolean;
  messages: ConversationMessage[];
  onToggle: () => void;
  onSaveExcerpt: (content: string) => void;
}

export default function ConversationModule({
  id,
  title,
  subtitle,
  isExpanded,
  isLoading = false,
  messages,
  onToggle,
  onSaveExcerpt
}: ConversationModuleProps) {
  const panelId = `${id}-conversation-panel`;

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
          {subtitle ? <small>{subtitle}</small> : null}
        </span>
        <span className="module-toggle" aria-hidden="true">
          {isExpanded ? "−" : "+"}
        </span>
      </button>

      {isExpanded ? (
        <div className="module-body" id={panelId}>
          <div className="message-list">
            {messages.length === 0 ? (
              <p className="module-empty">尚无记录。</p>
            ) : (
              messages.map((message) => (
                <div
                  className={`message-bubble message-${message.role}`}
                  key={message.id}
                >
                  <p>{message.content}</p>
                  {message.role === "assistant" ? (
                    <button
                      type="button"
                      className="excerpt-button"
                      aria-label="摘录这条回复"
                      onClick={() => onSaveExcerpt(message.content)}
                    >
                      摘录
                    </button>
                  ) : null}
                </div>
              ))
            )}
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
