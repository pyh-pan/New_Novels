import type { SourceDocument } from "./source-adaptation";
import { createCasePackageFromSource } from "./source-adaptation";
import { storeGeneratedStudioCase } from "./generated-cases";
import type { AIMessage } from "../ai/provider";

export type StudioJob = {
  id: string;
  type: "source-to-case" | "package-import";
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

const jobs = new Map<string, StudioJob>();

function sourceJobId(fileName: string, caseId?: string) {
  const seed = (caseId ?? Buffer.from(fileName).toString("base64url").slice(0, 18)) || "draft";
  const slug = seed
    .toLowerCase()
    .replace(/[^a-z0-9-]/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "");

  return `source-${slug || "draft"}`;
}

function failedSourceJob(fileName: string, error: string): StudioJob {
  return {
    id: sourceJobId(fileName),
    type: "source-to-case",
    status: "failed",
    progress: 100,
    currentStep: "生成失败",
    steps: [
      {
        id: "parse",
        label: "解析文件与元数据",
        status: "done",
        message: fileName
      },
      {
        id: "segment",
        label: "源文本分段",
        status: "failed",
        message: error
      },
      { id: "chapters", label: "生成章节文本", status: "pending" },
      { id: "agents", label: "生成 agents 与线索结构", status: "pending" },
      { id: "accusation", label: "生成最终指认问题", status: "pending" },
      { id: "validate", label: "校验案件包并进入预览", status: "pending" }
    ],
    error
  };
}

type SourceDraftJobOptions = {
  generateText?: (messages: AIMessage[]) => Promise<string>;
};

export async function createSourceDraftJob(
  source: SourceDocument,
  options: SourceDraftJobOptions = {}
): Promise<StudioJob> {
  try {
    const generated = await createCasePackageFromSource(source, {
      generateText: options.generateText
    });
    const draftCaseId = storeGeneratedStudioCase({
      caseFile: generated.package.caseFile,
      sourceProfile: generated.sourceProfile,
      segmentation: generated.segmentation,
      qualityReport: generated.qualityReport
    });
    const fatalIssues = generated.validation.issues.filter((issue) => issue.severity === "fatal");
    const job: StudioJob = {
      id: sourceJobId(source.fileName, draftCaseId),
      type: "source-to-case",
      status: fatalIssues.length > 0 ? "failed" : "ready",
      progress: 100,
      currentStep: fatalIssues.length > 0 ? "生成结果未通过校验" : "已生成可审阅草稿",
      draftCaseId: fatalIssues.length > 0 ? undefined : draftCaseId,
      steps: [
        {
          id: "parse",
          label: "解析文件与元数据",
          status: "done",
          message: `${source.fileName} · ${source.kind} · ${source.text.length} 字`
        },
        {
          id: "profile",
          label: "原文画像",
          status: "done",
          message: generated.sourceProfile.narrativeForm
        },
        {
          id: "segment",
          label: "源文本分段",
          status: "done",
          message: `已生成 ${generated.segmentation.length} 条 story-keep / investigation-hide / deduction-hide / solution-lock 分段。`
        },
        {
          id: "chapters",
          label: "生成章节文本",
          status: "done",
          message: `已生成 ${generated.package.caseFile.chapters.length} 个章节。`
        },
        {
          id: "agents",
          label: "生成 agents 与线索结构",
          status: "done",
          message: `已生成 ${generated.package.caseFile.agents.length} 个 agent 与 ${generated.package.caseFile.clues.length} 条线索。`
        },
        {
          id: "accusation",
          label: "生成最终指认问题",
          status: "done",
          message: `已生成 ${generated.package.caseFile.accusation.questions.length} 个最终指认问题。`
        },
        {
          id: "validate",
          label: "校验案件包并进入预览",
          status: fatalIssues.length > 0 ? "failed" : "done",
          message:
            fatalIssues.length > 0
              ? fatalIssues.map((issue) => issue.message).join("；")
              : "案件包已通过 schema 与改写质量门槛，可进入 Studio 审阅。"
        }
      ],
      error: fatalIssues.length > 0 ? fatalIssues.map((issue) => issue.message).join("；") : undefined
    };

    jobs.set(job.id, job);
    return job;
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知生成错误。";
    const job = failedSourceJob(source.fileName, message);
    jobs.set(job.id, job);
    return job;
  }
}

export function getSourceDraftJob(jobId: string): StudioJob {
  return jobs.get(jobId) ?? {
    ...failedSourceJob(jobId.replace(/^source-/, "") || "source.txt", "任务不存在或已过期。"),
    id: jobId
  };
}
