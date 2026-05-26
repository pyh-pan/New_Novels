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

export function createSourceDraftJob(fileName: string): StudioJob {
  return {
    id: `source-${Buffer.from(fileName).toString("base64url").slice(0, 18) || "draft"}`,
    type: "source-to-case",
    status: "ready",
    progress: 100,
    currentStep: "已生成可审阅草稿",
    draftCaseId: "hunters-lodge",
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
        status: "done",
        message: "已区分阅读保留、隐藏调查、后期推理和真相锁定内容。"
      },
      {
        id: "chapters",
        label: "生成章节文本",
        status: "done",
        message: "已生成章节审阅入口。"
      },
      {
        id: "agents",
        label: "生成 agents 与线索结构",
        status: "done",
        message: "已生成 agent、线索、矛盾和多幕推进审阅视图。"
      },
      {
        id: "accusation",
        label: "生成最终指认问题",
        status: "done",
        message: "已生成最终问题和证据支撑审阅视图。"
      },
      {
        id: "validate",
        label: "校验案件包并进入预览",
        status: "done",
        message: "本地 Studio v1 使用内置案件包作为审阅草稿，后续可替换为真实 skill runner 输出。"
      }
    ]
  };
}

export function getSourceDraftJob(jobId: string): StudioJob {
  return {
    ...createSourceDraftJob(jobId.replace(/^source-/, "") || "source.txt"),
    id: jobId
  };
}
