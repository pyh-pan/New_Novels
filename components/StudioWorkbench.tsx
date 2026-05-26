"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import type { StudioDraftView, StudioNodeType, StudioTreeNode } from "../lib/studio/draft";
import ConfirmDialog from "./ConfirmDialog";

type StudioWorkbenchProps = {
  draft: StudioDraftView;
};

type ReviewComment = {
  id: string;
  targetId: string;
  body: string;
};

function flattenNodes(nodes: StudioTreeNode[]): StudioTreeNode[] {
  return nodes.flatMap((node) => [node, ...(node.children ? flattenNodes(node.children) : [])]);
}

function SectionList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="studio-muted">暂无配置。</p>;
  }

  return (
    <ul className="studio-detail-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default function StudioWorkbench({ draft }: StudioWorkbenchProps) {
  const flatNodes = useMemo(() => flattenNodes(draft.tree), [draft.tree]);
  const [activeNodeId, setActiveNodeId] = useState("dashboard");
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [patchSummary, setPatchSummary] = useState("");
  const [lifecycleStatus, setLifecycleStatus] = useState(draft.lifecycleStatus ?? "published");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [studioActionError, setStudioActionError] = useState("");
  const activeNode = flatNodes.find((node) => node.id === activeNodeId) ?? draft.tree[0];
  const activeComments = comments.filter((comment) => comment.targetId === activeNode.id);
  const selectableNodes = flatNodes.map((node) => ({
    ...node,
    label: node.badge ? `${node.label} · ${node.badge}` : node.label
  }));

  function addComment(event: FormEvent<HTMLFormElement>) {
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

  function submitPatch() {
    setPatchSummary(
      `已生成 ${activeComments.length} 条修改建议。`
    );
  }

  async function runStudioAction(action: "save" | "publish") {
    setStudioActionError("");

    try {
      const response = await fetch(`/api/studio/cases/${draft.caseId}/${action}`, {
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
        window.location.href = payload.playHref ?? `/cases/${draft.caseId}`;
      }
    } catch (error) {
      setStudioActionError(error instanceof Error ? error.message : "操作失败。");
    }
  }

  return (
    <main className="studio-workbench">
      <header className="studio-workbench-topbar">
        <Link className="icon-action" href="/studio" aria-label="返回创作者工作台" title="返回创作者工作台">
          ←
        </Link>
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
          <Link className="icon-action" href={`/cases/${draft.caseId}`} aria-label="试玩案件" title="试玩案件">
            ▶
          </Link>
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

      <section className="studio-inspector" aria-label="案件审阅区">
        <Inspector draft={draft} nodeId={activeNode.id} nodeType={activeNode.type} />
      </section>

      <aside className="studio-agent-panel" aria-label="改写 agent 工作区">
        <div>
          <h2>改写助手</h2>
        </div>
        <div className="studio-context-card">
          <span>{activeNode.label}</span>
          <small>{activeComments.length} 条批注待提交</small>
        </div>
        <form className="studio-comment-form" onSubmit={addComment}>
          <label className="sr-only" htmlFor="studio-comment">
            批注
          </label>
          <textarea
            id="studio-comment"
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
            placeholder="批注"
            rows={5}
          />
          <button type="submit" disabled={!commentDraft.trim()}>
            添加
          </button>
        </form>
        <div className="studio-comments">
          {activeComments.length === 0 ? (
            <p>暂无批注</p>
          ) : (
            activeComments.map((comment) => (
              <article key={comment.id}>
                <p>{comment.body}</p>
              </article>
            ))
          )}
        </div>
        <button
          type="button"
          className="studio-submit-patch"
          disabled={activeComments.length === 0}
          onClick={submitPatch}
        >
          提交
        </button>
        {patchSummary ? (
          <div className="studio-patch-summary">
            <strong>变更建议</strong>
            <p>{patchSummary}</p>
            <button type="button">差异</button>
          </div>
        ) : null}
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
  if (nodeType === "chapter") {
    const chapter = draft.chapters.find((item) => item.id === nodeId) ?? draft.chapters[0];
    return (
      <article className="studio-inspector-page">
        <h2>{chapter.title}</h2>
        <div className="studio-prose">{chapter.body.split("\n").map((line) => <p key={line}>{line}</p>)}</div>
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
          {agent.actMatrix.map((row) => (
            <article key={row.actTitle}>
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
        {items.map((item) => (
          <section key={`${item.title}-${item.meta}`}>
            <small>{item.meta}</small>
            <h3>{item.title}</h3>
            <SectionList items={item.details} />
          </section>
        ))}
      </div>
    </article>
  );
}
