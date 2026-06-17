"use client";

import {
  ChangeEvent,
  CSSProperties,
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { StudioDraftView, StudioNodeType, StudioTreeNode } from "../lib/studio/draft";
import { fetchAppPath, navigateToAppPath } from "../lib/app/runtime-paths";
import AppLink from "./AppLink";
import ConfirmDialog from "./ConfirmDialog";

type StudioWorkbenchProps = {
  draft: StudioDraftView;
};

type ReviewComment = {
  id: string;
  targetId: string;
  body: string;
};

type ReviewReference = {
  summary: string;
  excerpt: string;
};

function flattenNodes(nodes: StudioTreeNode[]): StudioTreeNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenNodes(node.children) : [])]);
}

function compactText(value: string, maxLength = 220) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trim()}...`
    : normalized;
}

function chapterDisplayTitle(chapter: StudioDraftView["chapters"][number]) {
  return chapter.subtitle ?? chapter.title;
}

function getReviewReference(draft: StudioDraftView, node: StudioTreeNode): ReviewReference {
  if (node.type === "chapter") {
    const chapter = draft.chapters.find((item) => item.id === node.id) ?? draft.chapters[0];
    return {
      summary: chapter ? chapterDisplayTitle(chapter) : node.label,
      excerpt: compactText(chapter?.body ?? draft.title)
    };
  }

  if (node.type === "agent") {
    const agent = draft.agents.find((item) => item.id === node.id) ?? draft.agents[0];
    return {
      summary: agent ? agent.name : node.label,
      excerpt: compactText([agent?.role, agent?.personality, ...(agent?.boundaries ?? [])].filter(Boolean).join(" "))
    };
  }

  if (node.type === "clues") {
    return {
      summary: "线索",
      excerpt: compactText(draft.clues.map((clue) => `${clue.title}：${clue.text}`).join(" "))
    };
  }

  if (node.type === "contradictions") {
    return {
      summary: "矛盾",
      excerpt: compactText(draft.contradictions.map((item) => `${item.title}：${item.facts.join("、")}`).join(" "))
    };
  }

  if (node.type === "events") {
    return {
      summary: "故事事件",
      excerpt: compactText(draft.storyEvents.map((event) => `${event.title}：${event.designRationale}`).join(" "))
    };
  }

  if (node.type === "acts") {
    return {
      summary: "多幕推进",
      excerpt: compactText(draft.acts.map((act) => `${act.title}：${act.visibleClues.join("、")}`).join(" "))
    };
  }

  if (node.type === "accusation") {
    return {
      summary: "最终指认",
      excerpt: compactText(draft.accusation.map((item) => `${item.prompt} ${item.explanation}`).join(" "))
    };
  }

  if (node.id === "source-profile" && draft.sourceProfile) {
    return {
      summary: "原文画像",
      excerpt: compactText([
        draft.sourceProfile.title,
        draft.sourceProfile.author,
        draft.sourceProfile.narrativeForm,
        ...draft.sourceProfile.structureNotes
      ].join(" "))
    };
  }

  if (node.id === "segmentation" && draft.segmentation) {
    return {
      summary: "改写分段",
      excerpt: compactText(draft.segmentation.map((item) => `${item.label}：${item.reason}`).join(" "))
    };
  }

  if (node.id === "adaptation-notes" && draft.adaptationNotesMarkdown) {
    return {
      summary: "改写说明",
      excerpt: compactText(draft.adaptationNotesMarkdown)
    };
  }

  if (node.type === "validation") {
    return {
      summary: "校验报告",
      excerpt: compactText(draft.validation.map((item) => `${item.title}：${item.detail}`).join(" "))
    };
  }

  return {
    summary: "案件控制台",
    excerpt: `章节 ${draft.stats.chapters}，角色 ${draft.stats.agents}，线索 ${draft.stats.clues}，矛盾 ${draft.stats.contradictions}，事件 ${draft.stats.storyEvents}。`
  };
}

function SectionList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="studio-muted">暂无配置。</p>;
  }

  return (
    <ul className="studio-detail-list">
      {items.map((item, index) => (
        <li key={`${index}-${item}`}>{item}</li>
      ))}
    </ul>
  );
}

function MarkdownNote({ body }: { body: string }) {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="studio-prose">
      {lines.map((line, index) => {
        if (line.startsWith("# ")) {
          return <p key={`${index}-${line}`}>{line.replace(/^#\s+/u, "")}</p>;
        }
        if (line.startsWith("## ")) {
          return <h3 key={`${index}-${line}`}>{line.replace(/^##\s+/u, "")}</h3>;
        }
        if (line.startsWith("- ")) {
          return <p key={`${index}-${line}`}>{line.replace(/^-\s+/u, "")}</p>;
        }
        return <p key={`${index}-${line}`}>{line}</p>;
      })}
    </div>
  );
}

function clampPanelWidth(width: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(width)));
}

function resizeTextarea(textarea: HTMLTextAreaElement) {
  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

function AutoResizeStudioTextarea({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    if (textareaRef.current) {
      resizeTextarea(textareaRef.current);
    }
  }, [value]);

  const updateValue = (event: ChangeEvent<HTMLTextAreaElement>) => {
    resizeTextarea(event.target);
    onChange(event.target.value);
  };

  return (
    <textarea
      id="studio-comment"
      ref={textareaRef}
      value={value}
      onChange={updateValue}
      placeholder="修改建议"
      rows={1}
    />
  );
}

export default function StudioWorkbench({ draft }: StudioWorkbenchProps) {
  const flatNodes = useMemo(() => flattenNodes(draft.tree), [draft.tree]);
  const [activeNodeId, setActiveNodeId] = useState("dashboard");
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [lifecycleStatus, setLifecycleStatus] = useState(draft.lifecycleStatus ?? "published");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [studioActionError, setStudioActionError] = useState("");
  const [treeWidth, setTreeWidth] = useState(260);
  const [agentWidth, setAgentWidth] = useState(330);
  const activeNode = flatNodes.find((node) => node.id === activeNodeId) ?? draft.tree[0];
  const activeComments = comments.filter((comment) => comment.targetId === activeNode.id);
  const activeReference = getReviewReference(draft, activeNode);
  const selectableNodes = flatNodes.map((node) => ({
    ...node,
    label: node.badge ? `${node.label} · ${node.badge}` : node.label
  }));
  const workbenchStyle = {
    "--studio-tree-width": `${treeWidth}px`,
    "--studio-agent-width": `${agentWidth}px`
  } as CSSProperties;

  const beginStudioResize = (side: "tree" | "agent") => {
    return (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = side === "tree" ? treeWidth : agentWidth;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const move = (moveEvent: globalThis.PointerEvent) => {
        const delta = side === "tree"
          ? moveEvent.clientX - startX
          : startX - moveEvent.clientX;
        const nextWidth = startWidth + delta;

        if (side === "tree") {
          setTreeWidth(clampPanelWidth(nextWidth, 220, 420));
        } else {
          setAgentWidth(clampPanelWidth(nextWidth, 280, 520));
        }
      };

      const stop = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", stop);
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", stop, { once: true });
    };
  };

  function submitRevision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentDraft.trim();
    if (!body) {
      return;
    }

    setComments((current) => [
      ...current,
      {
        id: `comment-${Date.now()}`,
        targetId: activeNode.id,
        body
      }
    ]);
    setCommentDraft("");
  }

  async function runStudioAction(action: "save" | "publish") {
    setStudioActionError("");

    try {
      const response = await fetchAppPath(`/api/studio/cases/${draft.caseId}/${action}`, {
        method: "POST"
      });
      const payload = (await response.json().catch(() => undefined)) as
        | { status?: typeof lifecycleStatus; playHref?: string; error?: string }
        | undefined;

      if (!response.ok || !payload?.status) {
        throw new Error(payload?.error ?? "操作失败。");
      }

      setLifecycleStatus(payload.status);
      if (action === "publish") {
        navigateToAppPath(payload.playHref ?? `/cases/${draft.caseId}`);
      }
    } catch (error) {
      setStudioActionError(error instanceof Error ? error.message : "操作失败。");
    }
  }

  return (
    <main className="studio-workbench" style={workbenchStyle}>
      <header className="studio-workbench-topbar">
        <AppLink className="icon-action" href="/studio" aria-label="返回创作者工作台" title="返回创作者工作台">
          ←
        </AppLink>
        <div>
          <h1>{draft.title}</h1>
        </div>
        <div className="studio-workbench-actions">
          <span className="studio-status-pill">{statusLabel(lifecycleStatus)}</span>
          {draft.lifecycleStatus ? (
            <>
              <button
                type="button"
                className="icon-action"
                aria-label="保存草稿"
                title="保存草稿"
                onClick={() => void runStudioAction("save")}
              >
                ✓
              </button>
              <button
                type="button"
                className="icon-action"
                aria-label="发布案件"
                title="发布案件"
                onClick={() => setPublishConfirmOpen(true)}
              >
                ↑
              </button>
            </>
          ) : null}
          <AppLink className="icon-action" href={`/cases/${draft.caseId}`} aria-label="试玩案件" title="试玩案件">
            ▶
          </AppLink>
        </div>
      </header>
      {studioActionError ? <p className="studio-action-error">{studioActionError}</p> : null}
      {publishConfirmOpen ? (
        <ConfirmDialog
          title="发布案件"
          description="发布后会出现在书架，并可进入正式游玩。"
          confirmLabel="发布"
          onCancel={() => setPublishConfirmOpen(false)}
          onConfirm={() => {
            setPublishConfirmOpen(false);
            void runStudioAction("publish");
          }}
        />
      ) : null}

      <label className="studio-mobile-selector">
        <span className="sr-only">审阅内容</span>
        <select value={activeNodeId} onChange={(event) => setActiveNodeId(event.target.value)}>
          {selectableNodes.map((node) => (
            <option key={node.id} value={node.id}>
              {node.label}
            </option>
          ))}
        </select>
      </label>

      <aside className="studio-tree" aria-label="案件文件树">
        <div className="studio-tree-title">
          <h2>案件结构</h2>
        </div>
        {draft.tree.map((node) => (
          <div className="studio-tree-group" key={node.id}>
            <button
              type="button"
              className={activeNodeId === node.id ? "is-active" : ""}
              onClick={() => setActiveNodeId(node.id)}
            >
              {node.label}
              {node.badge ? <span>{node.badge}</span> : null}
            </button>
            {node.children ? (
              <div className="studio-tree-children">
                {node.children.map((child) => (
                  <button
                    type="button"
                    key={child.id}
                    className={activeNodeId === child.id ? "is-active" : ""}
                    onClick={() => setActiveNodeId(child.id)}
                  >
                    {child.label}
                    {child.badge ? <span>{child.badge}</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </aside>
      <div
        className="studio-resizer studio-resizer-tree"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整案件结构宽度"
        onPointerDown={beginStudioResize("tree")}
      />

      <section className="studio-inspector" aria-label="案件审阅区">
        <Inspector draft={draft} nodeId={activeNode.id} nodeType={activeNode.type} />
      </section>
      <div
        className="studio-resizer studio-resizer-agent"
        role="separator"
        aria-orientation="vertical"
        aria-label="调整改写助手宽度"
        onPointerDown={beginStudioResize("agent")}
      />

      <aside className="studio-agent-panel" aria-label="改写 agent 工作区">
        <div>
          <h2>改写助手</h2>
        </div>
        <form className="studio-comment-form" onSubmit={submitRevision}>
          <details className="studio-reference">
            <summary>{activeReference.summary}</summary>
            <blockquote>{activeReference.excerpt}</blockquote>
          </details>
          <label className="sr-only" htmlFor="studio-comment">
            修改建议
          </label>
          <AutoResizeStudioTextarea value={commentDraft} onChange={setCommentDraft} />
          <button type="submit" disabled={!commentDraft.trim()}>
            {commentDraft.trim()
              ? "提交修改建议"
              : activeComments.length > 0
                ? `已提交 ${activeComments.length} 条`
                : "提交修改建议"}
          </button>
        </form>
      </aside>
    </main>
  );
}

function statusLabel(status: "draft" | "saved" | "published") {
  if (status === "draft") {
    return "草稿";
  }
  if (status === "saved") {
    return "已保存";
  }
  return "已发布";
}

function Inspector({
  draft,
  nodeId,
  nodeType
}: {
  draft: StudioDraftView;
  nodeId: string;
  nodeType: StudioNodeType;
}) {
  if (nodeType === "adaptation") {
    return (
      <article className="studio-inspector-page">
        <h2>改写说明</h2>
        <MarkdownNote body={draft.adaptationNotesMarkdown ?? "暂无改写说明。"} />
      </article>
    );
  }

  if (nodeType === "chapter") {
    const chapter = draft.chapters.find((item) => item.id === nodeId) ?? draft.chapters[0];
    return (
      <article className="studio-inspector-page">
        <h2>{chapterDisplayTitle(chapter)}</h2>
        <div className="studio-prose">
          {chapter.body.split("\n").map((line, index) => <p key={`${chapter.id}-${index}`}>{line}</p>)}
        </div>
        <div className="studio-info-grid">
          <InfoBlock title="所属幕" items={[chapter.actId ?? "未绑定"]} />
          <InfoBlock title="玩家可见事实" items={chapter.visibleFacts} />
          <InfoBlock title="隐藏调查内容" items={chapter.hiddenInvestigation} />
          <InfoBlock title="关联线索" items={chapter.relatedClues} />
          <InfoBlock title="关联矛盾" items={chapter.relatedContradictions} />
          <InfoBlock title="下一幕条件" items={chapter.nextGate ? [chapter.nextGate] : []} />
        </div>
      </article>
    );
  }

  if (nodeType === "agent") {
    const agent = draft.agents.find((item) => item.id === nodeId) ?? draft.agents[0];
    return (
      <article className="studio-inspector-page">
        <h2>{agent.name}</h2>
        <p className="studio-lede">{agent.role}</p>
        <div className="studio-info-grid">
          <InfoBlock title="性格与语气" items={[agent.personality]} />
          <InfoBlock title="公开知识" items={agent.publicFacts} />
          <InfoBlock title="私有事实" items={agent.privateFacts} />
          <InfoBlock title="边界与禁止声明" items={agent.boundaries} />
          <InfoBlock title="揭示规则" items={agent.revealRules} />
        </div>
        <h3>章节约束矩阵</h3>
        <div className="studio-matrix">
          {agent.actMatrix.map((row, index) => (
            <article key={`${agent.id}-${index}`}>
              <strong>{row.actTitle}</strong>
              <span>{row.canAppear ? "可出现" : "不可出现"}</span>
              <small>可见线索：{row.visibleClues.join("、") || "无"}</small>
              <small>锁定事实：{row.lockedFacts.join("、") || "无"}</small>
            </article>
          ))}
        </div>
      </article>
    );
  }

  if (nodeType === "clues") {
    return (
      <CollectionPage title="线索" items={draft.clues.map((clue) => ({
        title: clue.title,
        meta: clue.source,
        details: [clue.text, ...clue.unlockHints, ...clue.supportsFacts]
      }))} />
    );
  }

  if (nodeType === "contradictions") {
    return (
      <CollectionPage title="矛盾" items={draft.contradictions.map((item) => ({
        title: item.title,
        meta: item.id,
        details: [...item.facts, ...item.clues, ...item.agents]
      }))} />
    );
  }

  if (nodeType === "events") {
    return (
      <CollectionPage title="故事事件" items={draft.storyEvents.map((event) => ({
        title: event.title,
        meta: `${event.kind} / ${event.timing}`,
        details: [
          event.description,
          ...event.trigger,
          ...event.effects,
          `设计理由：${event.designRationale}`
        ]
      }))} />
    );
  }

  if (nodeType === "acts") {
    return (
      <CollectionPage title="多幕推进" items={draft.acts.map((act) => ({
        title: act.title,
        meta: act.id,
        details: [
          `可用角色：${act.availableAgents.join("、") || "无"}`,
          `可见线索：${act.visibleClues.join("、") || "无"}`,
          `锁定事实：${act.lockedFacts.join("、") || "无"}`,
          ...act.gatesOut.map((gate) => `解锁 ${gate.toActId}：${gate.unlockNarrative}`)
        ]
      }))} />
    );
  }

  if (nodeType === "accusation") {
    return (
      <CollectionPage title="最终指认" items={draft.accusation.map((item) => ({
        title: item.prompt,
        meta: item.id,
        details: [
          `可接受答案：${item.acceptedAnswers.join(" / ")}`,
          item.explanation,
          `证据支撑：${item.supportingEvidence.join("、")}`
        ]
      }))} />
    );
  }

  if (nodeType === "validation") {
    if (nodeId === "source-profile" && draft.sourceProfile) {
      return (
        <CollectionPage
          title="原文画像"
          items={[
            {
              title: draft.sourceProfile.title,
              meta: draft.sourceProfile.narrativeForm,
              details: [
                `作者：${draft.sourceProfile.author}`,
                `语言：${draft.sourceProfile.language}`,
                `权利说明：${draft.sourceProfile.rightsNote}`,
                ...draft.sourceProfile.structureNotes,
                ...draft.sourceProfile.adaptationStrategy
              ]
            }
          ]}
        />
      );
    }

    if (nodeId === "segmentation" && draft.segmentation) {
      return (
        <CollectionPage
          title="改写分段"
          items={draft.segmentation.map((item) => ({
            title: item.sourceExcerpt,
            meta: item.label,
            details: [item.reason, `去向：${item.destination}`, `玩家发现路径：${item.playerDiscoveryRoute}`]
          }))}
        />
      );
    }

    return (
      <CollectionPage title="校验报告" items={draft.validation.map((item) => ({
        title: item.title,
        meta: item.severity,
        details: [item.detail]
      }))} />
    );
  }

  return (
    <article className="studio-inspector-page">
      <h2>故事可玩性与真相路径</h2>
      <dl className="studio-stat-grid">
        <Stat label="章节" value={draft.stats.chapters} />
        <Stat label="角色" value={draft.stats.agents} />
        <Stat label="线索" value={draft.stats.clues} />
        <Stat label="矛盾" value={draft.stats.contradictions} />
        <Stat label="事件" value={draft.stats.storyEvents} />
        <Stat label="幕" value={draft.stats.acts} />
        <Stat label="最终问题" value={draft.stats.accusationQuestions} />
      </dl>
      <h3>章节推进链</h3>
      <div className="studio-flow">
        {draft.acts.map((act) => (
          <article key={act.id}>
            <strong>{act.title}</strong>
            <span>{act.visibleClues.slice(0, 3).join("、") || "等待玩家探索"}</span>
          </article>
        ))}
      </div>
    </article>
  );
}

function InfoBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h3>{title}</h3>
      <SectionList items={items} />
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function CollectionPage({
  title,
  items
}: {
  title: string;
  items: Array<{ title: string; meta: string; details: string[] }>;
}) {
  return (
    <article className="studio-inspector-page">
      <h2>{title}</h2>
      <div className="studio-collection">
        {items.map((item, index) => (
          <section key={`${index}-${item.title}-${item.meta}`}>
            <small>{item.meta}</small>
            <h3>{item.title}</h3>
            <SectionList items={item.details} />
          </section>
        ))}
      </div>
    </article>
  );
}
