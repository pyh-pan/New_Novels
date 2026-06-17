import { casePackageSchema, type CasePackage } from "../case-package/schema";
import { caseSchema, type CaseFile } from "../case/schema";
import { createChatCompletion, type AIMessage } from "../ai/provider";
import type { CasePackageIssue, CasePackageValidationReport } from "../case-package/loader";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
const fairPlaySpineSchema = z.object({
  victim: nonEmptyString,
  culprit: nonEmptyString,
  motive: nonEmptyString,
  method: nonEmptyString,
  falseSolution: nonEmptyString,
  minimumClueChain: z.array(nonEmptyString).min(1),
  decisiveContradictions: z.array(nonEmptyString).min(1)
});
const adaptationNotesSchema = z.object({
  summary: nonEmptyString,
  readingStrategy: z.array(nonEmptyString).min(1),
  investigationStrategy: z.array(nonEmptyString).min(1),
  npcStrategy: z.array(nonEmptyString).min(1),
  actStructureStrategy: z.array(nonEmptyString).min(1),
  unresolvedRisks: z.array(nonEmptyString).default([])
});
const caseAdaptationModelOutputSchema = z.object({
  sourceProfile: sourceProfileSchema,
  segmentation: z.array(sourceSegmentationItemSchema).min(3),
  fairPlaySpine: fairPlaySpineSchema,
  adaptationNotes: adaptationNotesSchema,
  qualityReport: z.array(adaptationQualityItemSchema).default([]),
  caseFile: caseSchema
});

export type SourceProfile = z.infer<typeof sourceProfileSchema>;
export type SourceSegmentationItem = z.infer<typeof sourceSegmentationItemSchema>;
export type AdaptationQualityItem = z.infer<typeof adaptationQualityItemSchema>;
export type FairPlaySpine = z.infer<typeof fairPlaySpineSchema>;
export type AdaptationNotes = z.infer<typeof adaptationNotesSchema>;
export type CaseAdaptationModelOutput = z.input<typeof caseAdaptationModelOutputSchema>;
type ParsedCaseAdaptationModelOutput = z.infer<typeof caseAdaptationModelOutputSchema>;

export type AdaptationRequest = {
  source: SourceDocument;
  options: {
    targetLanguage: "zh-CN";
    adaptationGranularity: "publication-grade";
    investigationScope: "full-playable-investigation";
  };
  rights: {
    statement: string;
    requiresUserConfirmation: boolean;
  };
  skill: {
    name: "new-novels-case-adapter";
    version: string;
    loadedFiles: string[];
  };
};

export type AdaptationValidationReport = {
  ok: boolean;
  generatedAt: string;
  skillName: string;
  skillVersion: string;
  caseId: string;
  title: string;
  summary: {
    chapters: number;
    agents: number;
    acts: number;
    actGates: number;
    storyEvents: number;
    facts: number;
    clues: number;
    contradictions: number;
    accusationQuestions: number;
  };
  issues: CasePackageIssue[];
};

export type GeneratedCasePackage = {
  package: CasePackage;
  sourceProfile: SourceProfile;
  segmentation: SourceSegmentationItem[];
  fairPlaySpine: FairPlaySpine;
  adaptationNotes: AdaptationNotes;
  qualityReport: AdaptationQualityItem[];
  validation: CasePackageValidationReport;
  validationReport: AdaptationValidationReport;
  adaptationNotesMarkdown: string;
  request: AdaptationRequest;
};

type GenerateText = (messages: AIMessage[]) => Promise<string>;

type CreateCasePackageOptions = {
  generateText?: GenerateText;
};

const maxPromptSourceChars = 60_000;
const adapterSkillName = "new-novels-case-adapter";
const adapterSkillVersion = "new-novels-case-adapter/v1";
const adapterSkillFiles = [
  "skills/new-novels-case-adapter/SKILL.md",
  "skills/new-novels-case-adapter/references/case-package-v1.md",
  "skills/new-novels-case-adapter/references/novel-to-case-workflow.md",
  "skills/new-novels-case-adapter/references/studio-runner-contract.md"
];

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

export function loadAdapterSkillContract() {
  const root = process.cwd();
  const documents = adapterSkillFiles.map((filePath) => ({
    filePath,
    content: readFileSync(join(root, filePath), "utf8")
  }));

  return {
    name: adapterSkillName,
    version: adapterSkillVersion,
    loadedFiles: adapterSkillFiles,
    documents
  };
}

export function buildAdaptationRequest(source: SourceDocument): AdaptationRequest {
  const skill = loadAdapterSkillContract();

  return {
    source,
    options: {
      targetLanguage: "zh-CN",
      adaptationGranularity: "publication-grade",
      investigationScope: "full-playable-investigation"
    },
    rights: {
      statement: "上传者负责确认原文改写与发行权利；生成报告必须保留版权确认提示。",
      requiresUserConfirmation: true
    },
    skill: {
      name: adapterSkillName,
      version: skill.version,
      loadedFiles: skill.loadedFiles
    }
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
  "fairPlaySpine": {
    "victim": string,
    "culprit": string,
    "motive": string,
    "method": string,
    "falseSolution": string,
    "minimumClueChain": string[],
    "decisiveContradictions": string[]
  },
  "adaptationNotes": {
    "summary": string,
    "readingStrategy": string[],
    "investigationStrategy": string[],
    "npcStrategy": string[],
    "actStructureStrategy": string[],
    "unresolvedRisks": string[]
  },
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
  const request = buildAdaptationRequest(source);
  const skillContract = loadAdapterSkillContract();
  const sourceText =
    source.text.length > maxPromptSourceChars
      ? `${source.text.slice(0, maxPromptSourceChars)}\n\n[源文本过长，已截取前 ${maxPromptSourceChars} 字用于本轮生成。必须在 qualityReport 中标记需要补全全文审校。]`
      : source.text;

  return [
    {
      role: "system",
      content: `你是 New Novels Studio runner 内置的发行级推理故事改写 agent。你的任务是把用户上传的推理小说原文改写为可运行的互动推理案件包，而不是 demo。

Studio runner 默认输入：
- targetLanguage: ${request.options.targetLanguage}
- adaptationGranularity: ${request.options.adaptationGranularity}
- investigationScope: ${request.options.investigationScope}
- rights: ${request.rights.statement}

本轮生成必须遵守以下已加载 skill 契约文件：
${skillContract.documents.map((document) => `\n--- ${document.filePath} ---\n${document.content}`).join("\n")}

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

function qualityIssues(qualityReport: AdaptationQualityItem[]): CasePackageIssue[] {
  return qualityReport.map((item) => ({
    severity: item.severity,
    code: "source-quality",
    filePath: "generated",
    message: `${item.title}: ${item.detail}`,
    suggestion:
      item.severity === "fatal"
        ? "重新生成案件包，或在 Studio 中人工修正后再发布。"
        : "在 Studio 审阅阶段确认该风险是否需要修正。"
  }));
}

function summaryForCase(caseFile: CaseFile) {
  return {
    chapters: caseFile.chapters.length,
    agents: caseFile.agents.length,
    acts: caseFile.acts.length,
    actGates: caseFile.actGates.length,
    storyEvents: caseFile.storyEvents.length,
    facts: caseFile.facts.length,
    clues: caseFile.clues.length,
    contradictions: caseFile.contradictions.length,
    accusationQuestions: caseFile.accusation.questions.length
  };
}

export function createValidationReport(
  caseFile: CaseFile,
  request: AdaptationRequest,
  validationIssues: CasePackageIssue[],
  qualityReport: AdaptationQualityItem[]
): AdaptationValidationReport {
  const issues = [...validationIssues, ...qualityIssues(qualityReport)];

  return {
    ok: !issues.some((issue) => issue.severity === "fatal"),
    generatedAt: new Date().toISOString(),
    skillName: request.skill.name,
    skillVersion: request.skill.version,
    caseId: caseFile.id,
    title: caseFile.title,
    summary: summaryForCase(caseFile),
    issues
  };
}

function markdownList(items: string[]) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- 无";
}

export function createAdaptationNotesMarkdown({
  sourceProfile,
  request,
  fairPlaySpine,
  adaptationNotes,
  segmentation,
  validationReport
}: {
  sourceProfile: SourceProfile;
  request: AdaptationRequest;
  fairPlaySpine: FairPlaySpine;
  adaptationNotes: AdaptationNotes;
  segmentation: SourceSegmentationItem[];
  validationReport: AdaptationValidationReport;
}) {
  const segmentationSummary = segmentation.map((item) =>
    `- ${item.id} / ${item.label}: ${item.reason} -> ${item.destination}`
  );
  const validationSummary = validationReport.issues.map((issue) =>
    `- ${issue.severity}: ${issue.message}`
  );

  return `# ${sourceProfile.title} 改写说明

## Source Profile

- Title: ${sourceProfile.title}
- Author: ${sourceProfile.author}
- Language: ${sourceProfile.language}
- Narrative Form: ${sourceProfile.narrativeForm}
- Rights: ${sourceProfile.rightsNote}

## Default Options

- targetLanguage: ${request.options.targetLanguage}
- adaptationGranularity: ${request.options.adaptationGranularity}
- investigationScope: ${request.options.investigationScope}

## Fair-Play Spine

- Victim: ${fairPlaySpine.victim}
- Culprit: ${fairPlaySpine.culprit}
- Motive: ${fairPlaySpine.motive}
- Method: ${fairPlaySpine.method}
- False Solution: ${fairPlaySpine.falseSolution}

Minimum clue chain:
${markdownList(fairPlaySpine.minimumClueChain)}

Decisive contradictions:
${markdownList(fairPlaySpine.decisiveContradictions)}

## Segmentation Summary

${segmentationSummary.join("\n")}

## Reading Rewrite Strategy

${markdownList(adaptationNotes.readingStrategy)}

## Investigation Conversion Strategy

${markdownList(adaptationNotes.investigationStrategy)}

## NPC Runtime Strategy

${markdownList(adaptationNotes.npcStrategy)}

## Act Gates And Story Events

${markdownList(adaptationNotes.actStructureStrategy)}

## Validation Summary

- ok: ${validationReport.ok}
- fatal issues: ${validationReport.issues.filter((issue) => issue.severity === "fatal").length}
- warnings: ${validationReport.issues.filter((issue) => issue.severity === "warning").length}
- suggestions: ${validationReport.issues.filter((issue) => issue.severity === "suggestion").length}

${validationSummary.length > 0 ? validationSummary.join("\n") : "- 无校验问题"}

## Human Review Checklist

- 确认版权与改写授权。
- 检查故事正文是否仍像成熟推理小说，而不是案件摘要。
- 检查每条最终指认答案是否有公平线索支撑。
- 检查 NPC 是否只知道自己应当知道的信息。
- 检查普通对话是否不会提前泄露完整真相。

## Unresolved Risks

${markdownList(adaptationNotes.unresolvedRisks)}
`;
}

export async function createCasePackageFromSource(
  source: SourceDocument,
  options: CreateCasePackageOptions = {}
): Promise<GeneratedCasePackage> {
  const request = buildAdaptationRequest(source);
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
    const validation = validateGeneratedCasePackage(pkg as CasePackage);
    const validationReport = createValidationReport(
      caseFile,
      request,
      validation.issues,
      output.qualityReport
    );

    return {
      package: pkg as CasePackage,
      sourceProfile: output.sourceProfile,
      segmentation: output.segmentation,
      fairPlaySpine: output.fairPlaySpine,
      adaptationNotes: output.adaptationNotes,
      qualityReport: output.qualityReport,
      validation: {
        ok: validationReport.ok,
        issues: validationReport.issues
      },
      validationReport,
      adaptationNotesMarkdown: createAdaptationNotesMarkdown({
        sourceProfile: output.sourceProfile,
        request,
        fairPlaySpine: output.fairPlaySpine,
        adaptationNotes: output.adaptationNotes,
        segmentation: output.segmentation,
        validationReport
      }),
      request
    };
  }

  const shapeIssues = validateAdaptationShape(output);
  const validationReport = createValidationReport(
    caseFile,
    request,
    shapeIssues,
    output.qualityReport
  );

  return {
    package: packageResult.data,
    sourceProfile: output.sourceProfile,
    segmentation: output.segmentation,
    fairPlaySpine: output.fairPlaySpine,
    adaptationNotes: output.adaptationNotes,
    qualityReport: output.qualityReport,
    validation: {
      ok: validationReport.ok,
      issues: validationReport.issues
    },
    validationReport,
    adaptationNotesMarkdown: createAdaptationNotesMarkdown({
      sourceProfile: output.sourceProfile,
      request,
      fairPlaySpine: output.fairPlaySpine,
      adaptationNotes: output.adaptationNotes,
      segmentation: output.segmentation,
      validationReport
    }),
    request
  };
}
