"use client";

import { ChangeEvent, useRef, useState } from "react";
import { fetchAppPath } from "../lib/app/runtime-paths";

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

export default function CaseImportPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<CasePreviewResponse | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function previewFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsLoading(true);
    setError("");
    setPreview(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetchAppPath("/api/cases/preview", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as CasePreviewResponse;
      setPreview(payload);
      if (!response.ok || !payload.ok) {
        setError("案件包还不能导入，请先修复校验问题。");
      }
    } catch {
      setError("案件包预览失败，请检查 zip 文件。");
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="case-import">
      <button
        type="button"
        className="utility-button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        导入案件包
      </button>

      {isOpen ? (
        <section className="case-import-popover" aria-label="案件包导入预览">
          <div className="case-import-heading">
            <strong>案件包预览</strong>
            <span>case-package/v1</span>
          </div>
          <label className="case-import-dropzone">
            <span>选择案件包 zip</span>
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip"
              aria-label="选择案件包 zip"
              onChange={previewFile}
            />
          </label>
          {isLoading ? <p className="case-import-muted">正在校验案件包...</p> : null}
          {error ? <p className="case-import-error">{error}</p> : null}
          {preview?.ok ? (
            <article className="case-import-result">
              <small>{preview.manifest.schemaVersion}</small>
              <h3>{preview.caseSummary.title}</h3>
              <p>
                章节 {preview.caseSummary.chapters} · Agent {preview.caseSummary.agents} · 幕{" "}
                {preview.caseSummary.acts} · 线索 {preview.caseSummary.clues}
              </p>
              <p>最终指认题 {preview.caseSummary.accusationQuestions} 道</p>
            </article>
          ) : null}
          {preview && !preview.ok ? (
            <div className="case-import-issues">
              {preview.issues.map((issue) => (
                <article key={`${issue.code}-${issue.filePath ?? ""}-${issue.fieldPath ?? ""}`}>
                  <strong>{issue.message}</strong>
                  <small>{issue.filePath ?? "upload"}</small>
                  {issue.suggestion ? <p>{issue.suggestion}</p> : null}
                </article>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
