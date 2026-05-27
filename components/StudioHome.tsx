"use client";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import AppLink from "./AppLink";
import { fetchAppPath, navigateToAppPath } from "../lib/app/runtime-paths";

type StudioJob = {
  id: string;
  status: "queued" | "running" | "failed" | "ready";
  progress: number;
  currentStep: string;
  draftCaseId?: string;
  steps: Array<{
    id: string;
    label: string;
    status: "pending" | "running" | "done" | "failed";
    message?: string;
  }>;
  error?: string;
};

type CasePreviewIssue = {
  severity: "fatal" | "warning" | "suggestion";
  code: string;
  filePath?: string;
  fieldPath?: string;
  message: string;
  suggestion?: string;
};

type CasePreviewResponse =
  | {
      ok: true;
      draftCaseId: string;
      status: "draft";
      manifest: {
        schemaVersion: string;
        caseId: string;
        title: string;
      };
      caseSummary: {
        id: string;
        title: string;
        chapters: number;
        agents: number;
        acts: number;
        clues: number;
        accusationQuestions: number;
      };
      issues: CasePreviewIssue[];
    }
  | {
      ok: false;
      issues: CasePreviewIssue[];
    };

type Modal = "source" | "package" | null;

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => undefined)) as
    | (T & { error?: string })
    | undefined;
  if (!response.ok || !payload) {
    throw new Error(payload?.error ?? "请求失败。");
  }
  return payload;
}

type StudioHomeProps = {
  navigateTo?: (href: string) => void;
};

export default function StudioHome({
  navigateTo = (href: string) => {
    navigateToAppPath(href);
  }
}: StudioHomeProps = {}) {
  const [modal, setModal] = useState<Modal>(null);
  const [sourceJob, setSourceJob] = useState<StudioJob | null>(null);
  const [sourceError, setSourceError] = useState("");
  const [packagePreview, setPackagePreview] = useState<CasePreviewResponse | null>(null);
  const [packageError, setPackageError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const sourceInputRef = useRef<HTMLInputElement | null>(null);
  const packageInputRef = useRef<HTMLInputElement | null>(null);

  const activeIssueCount = useMemo(() => {
    if (!packagePreview) {
      return 0;
    }
    return packagePreview.issues.length;
  }, [packagePreview]);

  async function uploadSource(file: File) {
    setIsLoading(true);
    setSourceError("");
    setSourceJob(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const created = await fetchAppPath("/api/studio/source-jobs", {
        method: "POST",
        body: formData
      }).then((response) => readJson<StudioJob>(response));
      setSourceJob(created);

      const completed = await fetchAppPath(`/api/studio/jobs/${created.id}`).then((response) =>
        readJson<StudioJob>(response)
      );
      setSourceJob(completed);
      if (completed.draftCaseId) {
        navigateTo(`/studio/cases/${completed.draftCaseId}`);
      }
    } catch (error) {
      setSourceError(
        error instanceof Error
          ? error.message
          : "原文生成任务创建失败。请检查文件格式后重试。"
      );
    } finally {
      setIsLoading(false);
      if (sourceInputRef.current) {
        sourceInputRef.current.value = "";
      }
    }
  }

  async function previewPackage(file: File) {
    setIsLoading(true);
    setPackageError("");
    setPackagePreview(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetchAppPath("/api/cases/preview", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as CasePreviewResponse;
      setPackagePreview(payload);
      if (!response.ok || !payload.ok) {
        setPackageError("案件包存在校验问题，可以进入工作台审阅，但发布前必须修复 fatal 问题。");
      } else {
        navigateTo(`/studio/cases/${payload.draftCaseId}`);
      }
    } catch {
      setPackageError("案件包预览失败，请检查 zip 文件。");
    } finally {
      setIsLoading(false);
      if (packageInputRef.current) {
        packageInputRef.current.value = "";
      }
    }
  }

  function sourceChanged(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void uploadSource(file);
    }
  }

  function packageChanged(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void previewPackage(file);
    }
  }

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <AppLink className="icon-action" href="/" aria-label="返回故事书架" title="返回故事书架">
          ←
        </AppLink>
        <div>
          <h1>创作者工作台</h1>
        </div>
      </header>

      <section className="studio-launcher" aria-label="创作者入口">
        <button type="button" className="studio-primary-choice" onClick={() => setModal("source")}>
          <span>上传原文</span>
        </button>
        <button type="button" className="studio-primary-choice" onClick={() => setModal("package")}>
          <span>导入案件包</span>
        </button>
      </section>

      {modal === "source" ? (
        <ConfirmDialog
          title="上传原文"
          description="生成案件草稿。"
          confirmLabel={sourceJob?.draftCaseId ? "进入审阅工作台" : "关闭"}
          onCancel={() => setModal(null)}
          onConfirm={() => {
            if (sourceJob?.draftCaseId) {
              navigateTo(`/studio/cases/${sourceJob.draftCaseId}`);
            } else {
              setModal(null);
            }
          }}
        >
          <label className="studio-dropzone">
            <span>.txt / .md / .pdf</span>
            <input
              ref={sourceInputRef}
              type="file"
              accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
              aria-label="选择原文文件"
              onChange={sourceChanged}
            />
          </label>
          <div className="studio-progress" aria-live="polite">
            <div className="studio-progress-track">
              <span style={{ width: `${sourceJob?.progress ?? 0}%` }} />
            </div>
            <div className="studio-progress-meta">
              <span>{sourceJob?.currentStep ?? (isLoading ? "正在创建任务..." : "等待上传")}</span>
              <span>{sourceJob?.progress ?? 0}%</span>
            </div>
          </div>
          {sourceError ? <p className="studio-error">{sourceError}</p> : null}
          <ol className="studio-step-list">
            {(sourceJob?.steps ?? defaultSourceSteps).map((step) => (
              <li key={step.id} data-status={step.status}>
                <span>{step.label}</span>
                {step.message ? <small>{step.message}</small> : null}
              </li>
            ))}
          </ol>
        </ConfirmDialog>
      ) : null}

      {modal === "package" ? (
        <ConfirmDialog
          title="导入案件包"
          description="校验案件包。"
          confirmLabel={packagePreview?.ok ? "进入审阅工作台" : "关闭"}
          onCancel={() => setModal(null)}
          onConfirm={() => {
            if (packagePreview?.ok) {
              navigateTo(`/studio/cases/${packagePreview.draftCaseId}`);
            } else {
              setModal(null);
            }
          }}
        >
          <label className="studio-dropzone">
            <span>case-package/v1 zip</span>
            <input
              ref={packageInputRef}
              type="file"
              accept=".zip,application/zip"
              aria-label="选择案件包 zip"
              onChange={packageChanged}
            />
          </label>
          {packageError ? <p className="studio-error">{packageError}</p> : null}
          {packagePreview?.ok ? (
            <article className="studio-package-summary">
              <small>{packagePreview.manifest.schemaVersion}</small>
              <h2>{packagePreview.caseSummary.title}</h2>
              <dl>
                <div>
                  <dt>章节</dt>
                  <dd>{packagePreview.caseSummary.chapters}</dd>
                </div>
                <div>
                  <dt>角色</dt>
                  <dd>{packagePreview.caseSummary.agents}</dd>
                </div>
                <div>
                  <dt>幕</dt>
                  <dd>{packagePreview.caseSummary.acts}</dd>
                </div>
                <div>
                  <dt>问题</dt>
                  <dd>{packagePreview.caseSummary.accusationQuestions}</dd>
                </div>
              </dl>
              <p>{activeIssueCount === 0 ? "校验通过，可以进入审阅。" : `发现 ${activeIssueCount} 个问题。`}</p>
            </article>
          ) : null}
          {packagePreview && !packagePreview.ok ? (
            <div className="studio-issue-list">
              {packagePreview.issues.map((issue) => (
                <article key={`${issue.code}-${issue.fieldPath ?? ""}`}>
                  <strong>{issue.message}</strong>
                  <small>{issue.filePath ?? "upload"}</small>
                  {issue.suggestion ? <p>{issue.suggestion}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </main>
  );
}

const defaultSourceSteps: StudioJob["steps"] = [
  { id: "parse", label: "解析文件与元数据", status: "pending" },
  { id: "profile", label: "原文画像", status: "pending" },
  { id: "segment", label: "源文本分段", status: "pending" },
  { id: "chapters", label: "生成章节文本", status: "pending" },
  { id: "agents", label: "生成 agents 与线索结构", status: "pending" },
  { id: "accusation", label: "生成最终指认问题", status: "pending" },
  { id: "validate", label: "校验案件包并进入预览", status: "pending" }
];
