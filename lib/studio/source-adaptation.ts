import { casePackageSchema, type CasePackage } from "../case-package/schema";
import { caseSchema, type CaseFile } from "../case/schema";
import { createChatCompletion, type AIMessage } from "../ai/provider";
import type { CasePackageIssue, CasePackageValidationReport } from "../case-package/loader";
import { z } from "zod";

export type SourceDocumentKind = "text" | "markdown" | "pdf";

export type SourceDocument = {
  fileName: string;
  kind: SourceDocumentKind;
  text: string;
};

export type SourceSegmentationLabel =
  | "story-keep"
  | "investigation-hide"
  | "deduction-hide"
  | "solution-lock"
  | "bridge-rewrite";

const nonEmptyString = z.string().trim().min(1);
const sourceSegmentationLabelSchema = z.enum([
  "story-keep",
  "investigation-hide",
  "deduction-hide",
  "solution-lock",
  "bridge-rewrite"
]);
const sourceProfileSchema = z.object({
  title: nonEmptyString,
  author: nonEmptyString,
  language: nonEmptyString,
  narrativeForm: nonEmptyString,
  structureNotes: z.array(nonEmptyString).min(1),
  adaptationStrategy: z.array(nonEmptyString).min(1),
  rightsNote: nonEmptyString
});
const sourceSegmentationItemSchema = z.object({
  id: nonEmptyString,
  label: sourceSegmentationLabelSchema,
  sourceExcerpt: nonEmptyString,
  reason: nonEmptyString,
  destination: nonEmptyString,
  playerDiscoveryRoute: nonEmptyString
});
const adaptationQualityItemSchema = z.object({
  severity: z.enum(["fatal", "warning", "suggestion"]),
  title: nonEmptyString,
  detail: nonEmptyString
});
const caseAdaptationModelOutputSchema = z.object({
  sourceProfile: sourceProfileSchema,
  segmentation: z.array(sourceSegmentationItemSchema).min(3),
  qualityReport: z.array(adaptationQualityItemSchema).default([]),
  caseFile: caseSchema
});

export type SourceProfile = z.infer<typeof sourceProfileSchema>;
export type SourceSegmentationItem = z.infer<typeof sourceSegmentationItemSchema>;
export type AdaptationQualityItem = z.infer<typeof adaptationQualityItemSchema>;
export type CaseAdaptationModelOutput = z.input<typeof caseAdaptationModelOutputSchema>;
type ParsedCaseAdaptationModelOutput = z.infer<typeof caseAdaptationModelOutputSchema>;

export type GeneratedCasePackage = {
  package: CasePackage;
  sourceProfile: SourceProfile;
  segmentation: SourceSegmentationItem[];
  qualityReport: AdaptationQualityItem[];
  validation: CasePackageValidationReport;
};

type GenerateText = (messages: AIMessage[]) => Promise<string>;

type CreateCasePackageOptions = {
  generateText?: GenerateText;
};

const maxPromptSourceChars = 60_000;

function detectKind(fileName: string, mimeType?: string): SourceDocumentKind {
  if (/\.pdf$/iu.test(fileName) || mimeType === "application/pdf") {
    return "pdf";
  }
  if (/\.md$/iu.test(fileName) || mimeType === "text/markdown") {
    return "markdown";
  }
  return "text";
}

function cleanText(text: string): string {
  return text
    .split(String.fromCharCode(0))
    .join("")
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/\n{4,}/gu, "\n\n\n")
    .trim();
}

async function extractPdfText(buffer: ArrayBuffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: Buffer.from(buffer) });

  try {
    const result = await parser.getText();
    return cleanText(result.text);
  } finally {
    await parser.destroy();
  }
}

export async function extractSourceDocument(file: File): Promise<SourceDocument> {
  const fileName = file.name;
  const kind = detectKind(fileName, file.type);
  const buffer =
    typeof file.arrayBuffer === "function"
      ? await file.arrayBuffer()
      : new TextEncoder().encode(await file.text()).buffer;
  const text =
    kind === "pdf"
      ? await extractPdfText(buffer)
      : cleanText(new TextDecoder("utf-8").decode(buffer));

  if (text.length < 120) {
    throw new Error("Source text is too short or could not be extracted.");
  }

  return {
    fileName,
    kind,
    text
  };
}

function modelJsonInstruction() {
  return `你必须只返回一个合法 JSON 对象，不要 Markdown，不要代码块。JSON 顶层结构必须是：
{
  "sourceProfile": {
    "title": string,
    "author": string,
    "language": "zh-CN",
    "narrativeForm": string,
    "structureNotes": string[],
    "adaptationStrategy": string[],
    "rightsNote": string
  },
  "segmentation": [{
    "id": string,
    "label": "story-keep" | "investigation-hide" | "deduction-hide" | "solution-lock" | "bridge-rewrite",
    "sourceExcerpt": string,
    "reason": string,
    "destination": string,
    "playerDiscoveryRoute": string
  }],
  "qualityReport": [{
    "severity": "fatal" | "warning" | "suggestion",
    "title": string,
    "detail": string
  }],
  "caseFile": case-package/v1 的完整 case.json 内联结构，必须包含 storyEvents。storyEvents 每项包含：
  {
    "id": string,
    "kind": "instant-result" | "agent-state-change" | "story-beat" | "act-transition",
    "title": string,
    "description": string,
    "timing": "none" | "immediate" | "story-beat" | "act-transition",
    "trigger": {
      "requiresAct"?: string,
      "agentId"?: string,
      "topics": string[],
      "requiredClueIds": string[],
      "requiredFactIds": string[],
      "requiredContradictionIds": string[],
      "requiredNpcInteractions": string[],
      "requiredSceneInteractions": string[]
    },
    "effects": {
      "revealedFactIds": string[],
      "revealedClueIds": string[],
      "revealedContradictionIds": string[],
      "targetAgentIds": string[],
      "nextActId"?: string,
      "narrative": string
    },
    "designRationale": string
  }
}`;
}

export function buildSourceAdaptationMessages(source: SourceDocument): AIMessage[] {
  const sourceText =
    source.text.length > maxPromptSourceChars
      ? `${source.text.slice(0, maxPromptSourceChars)}\n\n[源文本过长，已截取前 ${maxPromptSourceChars} 字用于本轮生成。必须在 qualityReport 中标记需要补全全文审校。]`
      : source.text;

  return [
    {
      role: "system",
      content: `你是 New Novels 的发行级推理故事改写 agent。你的任务是把用户上传的推理小说原文改写为可运行的互动推理案件包，而不是 demo。

核心目标：
- 交付成熟、可审阅、可大规模分发的中文互动推理故事。
- 先分析原文特征，再设计案件结构；不能套用固定幕数、固定嫌疑人数量、固定章节数量或固定线索模板。
- 固定的是 case-package/v1 文件系统和数据契约；灵活的是叙事节奏、章节数量、幕结构、agent 数量、线索路径、压力机制和最终指认问题。
- 尽可能保留非探案过程的文学叙述；把侦探搜证、推理、逼问、真相揭示转化为玩家可探索内容。

必须执行的流程：
1. Source Profile：判断叙事人称、故事结构、主要人物、案发节点、调查节点、真相节点、是否适合多幕推进。
2. Source Segmentation Pass：把原文片段标为 story-keep、investigation-hide、deduction-hide、solution-lock、bridge-rewrite。
3. Fair-Play Spine：提取受害者、真凶、动机、方法、时间线、决定性证据、必要误导。
4. Adaptive Design：根据原文而不是模板决定章节、幕、agent、场景、线索、矛盾、推进门槛和最终指认。
5. Story Event Design：为原文中的行动后果建立 storyEvents。查账单、查登记、查时刻表等纯记录核查使用 instant-result，timing 必须是 none，不推进故事时间；玩家暴露怀疑导致 NPC 防御使用 agent-state-change；NPC 消失、证据被移动、波洛电报改变调查方向等世界状态变化使用 story-beat；调查阶段打开使用 act-transition。
6. Publication Rewrite：正文必须是成熟中文样章，不能是剧情摘要；隐藏探案段落后必须补足连贯性。
7. Agent Design：每个 NPC 的性格、压力水平、隐瞒边界、撒谎习惯、揭示规则都必须来自原文角色特征。
8. Strict Validation：所有 id 引用必须一致；general agent 必须存在；truth.culprit 必须是 agent id；truth.victim 必须是 victim id；不能编造没有原文支撑的核心事实。

质量底线：
- 如果原文缺少明确真相，必须在 qualityReport 中标 fatal，不能硬编。
- 如果 PDF/OCR 或截断导致信息不足，必须在 qualityReport 中标 warning/fatal。
- 输出的 caseFile 必须能被现有 case schema 直接解析。
- caseFile.storyEvents 必须覆盖调查动作的因果顺序，且不能把现实耗时误当成游戏时间机制。
- 所有面向读者的正文、agent 内容、线索内容必须使用中文。

${modelJsonInstruction()}`
    },
    {
      role: "user",
      content: `文件名：${source.fileName}
文件类型：${source.kind}

原文：
${sourceText}`
    }
  ];
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/u);
  const candidate = fenced?.[1] ?? trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  const jsonText =
    firstBrace >= 0 && lastBrace > firstBrace
      ? candidate.slice(firstBrace, lastBrace + 1)
      : candidate;

  return JSON.parse(jsonText);
}

function missingCasePackageIssue(message: string): CasePackageIssue {
  return {
    severity: "fatal",
    code: "source-adaptation",
    filePath: "generated",
    message,
    suggestion: "重新生成案件包，或在 Studio 中人工修正后再发布。"
  };
}

function validateGeneratedCasePackage(pkg: CasePackage): CasePackageValidationReport {
  const result = casePackageSchema.safeParse(pkg);

  if (result.success) {
    return {
      ok: true,
      issues: []
    };
  }

  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({
      severity: "fatal",
      code: issue.code,
      filePath: "generated",
      fieldPath: issue.path.join("."),
      message: issue.message,
      suggestion: "修正生成数据，使其满足 case-package/v1。"
    }))
  };
}

function createManifest(caseFile: CaseFile) {
  return {
    schemaVersion: "case-package/v1" as const,
    caseId: caseFile.id,
    title: caseFile.title,
    language: "zh-CN",
    entryChapterId: caseFile.chapters[0].id,
    createdBy: "new-novels-case-adapter",
    source: {
      title: caseFile.source.title,
      author: caseFile.source.author,
      rightsNote: caseFile.source.publicDomainNote
    }
  };
}

function validateAdaptationShape(output: ParsedCaseAdaptationModelOutput) {
  const labels = new Set(output.segmentation.map((item) => item.label));
  const issues: CasePackageIssue[] = [];

  if (!labels.has("story-keep")) {
    issues.push(missingCasePackageIssue("segmentation must include at least one story-keep item."));
  }
  if (!labels.has("investigation-hide") && !labels.has("deduction-hide")) {
    issues.push(
      missingCasePackageIssue(
        "segmentation must hide at least one investigation or deduction item for player discovery."
      )
    );
  }
  if (!labels.has("solution-lock")) {
    issues.push(missingCasePackageIssue("segmentation must include solution-lock truth material."));
  }
  if (output.qualityReport.some((item) => item.severity === "fatal")) {
    issues.push(
      ...output.qualityReport
        .filter((item) => item.severity === "fatal")
        .map((item) => missingCasePackageIssue(`${item.title}: ${item.detail}`))
    );
  }

  return issues;
}

export async function createCasePackageFromSource(
  source: SourceDocument,
  options: CreateCasePackageOptions = {}
): Promise<GeneratedCasePackage> {
  const generateText =
    options.generateText ??
    ((messages: AIMessage[]) => createChatCompletion({ messages, temperature: 0.2, maxTokens: 12000 }));
  const raw = await generateText(buildSourceAdaptationMessages(source));
  const output = caseAdaptationModelOutputSchema.parse(parseJsonObject(raw));
  const caseFile = output.caseFile;
  const pkg = {
    manifest: createManifest(caseFile),
    caseFile
  };
  const packageResult = casePackageSchema.safeParse(pkg);

  if (!packageResult.success) {
    return {
      package: pkg as CasePackage,
      sourceProfile: output.sourceProfile,
      segmentation: output.segmentation,
      qualityReport: output.qualityReport,
      validation: validateGeneratedCasePackage(pkg as CasePackage)
    };
  }

  const shapeIssues = validateAdaptationShape(output);

  return {
    package: packageResult.data,
    sourceProfile: output.sourceProfile,
    segmentation: output.segmentation,
    qualityReport: output.qualityReport,
    validation: {
      ok: shapeIssues.length === 0,
      issues: shapeIssues
    }
  };
}
