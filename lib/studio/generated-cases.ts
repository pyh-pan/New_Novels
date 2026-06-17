import type { CaseFile } from "../case/schema";
import type {
  AdaptationNotes,
  AdaptationQualityItem,
  AdaptationRequest,
  AdaptationValidationReport,
  FairPlaySpine,
  SourceProfile,
  SourceSegmentationItem
} from "./source-adaptation";
import {
  loadPersistedPublishedCase,
  loadPersistedStudioDraft,
  listPersistedPublishedCases,
  persistStudioDraft,
  writePublishedCasePackage
} from "./case-persistence";

export type GeneratedStudioCase = {
  caseFile: CaseFile;
  origin: "generated-from-source" | "uploaded-package";
  sourceProfile: SourceProfile;
  segmentation: SourceSegmentationItem[];
  fairPlaySpine: FairPlaySpine;
  adaptationNotes: AdaptationNotes;
  validationReport: AdaptationValidationReport;
  adaptationNotesMarkdown: string;
  skill: AdaptationRequest["skill"];
  qualityReport: AdaptationQualityItem[];
  status: "draft" | "saved" | "published";
  updatedAt: string;
  publishedAt?: string;
};

const generatedCases = new Map<string, GeneratedStudioCase>();

type StoreGeneratedStudioCaseInput = Omit<
  GeneratedStudioCase,
  | "status"
  | "updatedAt"
  | "publishedAt"
  | "origin"
  | "fairPlaySpine"
  | "adaptationNotes"
  | "validationReport"
  | "adaptationNotesMarkdown"
  | "skill"
> & Partial<Pick<
  GeneratedStudioCase,
  "origin" | "fairPlaySpine" | "adaptationNotes" | "validationReport" | "adaptationNotesMarkdown" | "skill"
>>;

function nowIso() {
  return new Date().toISOString();
}

function defaultFairPlaySpine(caseFile: CaseFile): FairPlaySpine {
  return {
    victim: caseFile.truth.victim,
    culprit: caseFile.truth.culprit,
    motive: caseFile.truth.motive,
    method: caseFile.truth.method,
    falseSolution: "未单独记录；请在 Studio 审阅时确认误导路径。",
    minimumClueChain: caseFile.truth.decisiveEvidence,
    decisiveContradictions: caseFile.contradictions.map((item) => item.title)
  };
}

function defaultAdaptationNotes(caseFile: CaseFile): AdaptationNotes {
  return {
    summary: `${caseFile.title} 已按 case-package/v1 组织为可审阅案件草稿。`,
    readingStrategy: ["保留案件故事章节，并通过 Studio 审阅正文质量。"],
    investigationStrategy: ["通过 facts、clues、contradictions、scenes 和 reveal rules 支撑玩家调查。"],
    npcStrategy: ["通过 agent knowledge、boundaries、pressureProfile 和 revealRules 控制 NPC 行为。"],
    actStructureStrategy: ["通过 acts、actGates 和 storyEvents 表达调查阶段与因果推进。"],
    unresolvedRisks: ["需要人工审校推理公平性、文学表达和版权状态。"]
  };
}

function defaultSkill(): AdaptationRequest["skill"] {
  return {
    name: "new-novels-case-adapter",
    version: "new-novels-case-adapter/v1",
    loadedFiles: [
      "skills/new-novels-case-adapter/SKILL.md",
      "skills/new-novels-case-adapter/references/case-package-v1.md",
      "skills/new-novels-case-adapter/references/novel-to-case-workflow.md",
      "skills/new-novels-case-adapter/references/studio-runner-contract.md"
    ]
  };
}

function defaultValidationReport(
  caseFile: CaseFile,
  skill: AdaptationRequest["skill"]
): AdaptationValidationReport {
  return {
    ok: true,
    generatedAt: nowIso(),
    skillName: skill.name,
    skillVersion: skill.version,
    caseId: caseFile.id,
    title: caseFile.title,
    summary: {
      chapters: caseFile.chapters.length,
      agents: caseFile.agents.length,
      acts: caseFile.acts.length,
      actGates: caseFile.actGates.length,
      storyEvents: caseFile.storyEvents.length,
      facts: caseFile.facts.length,
      clues: caseFile.clues.length,
      contradictions: caseFile.contradictions.length,
      accusationQuestions: caseFile.accusation.questions.length
    },
    issues: []
  };
}

function defaultAdaptationNotesMarkdown(caseFile: CaseFile, notes: AdaptationNotes) {
  return `# ${caseFile.title} 改写说明

## Summary

${notes.summary}

## Human Review Checklist

- 确认版权与改写授权。
- 检查故事正文、推理公平性和 NPC 知识边界。
`;
}

function normalizeGeneratedStudioCase(draft: GeneratedStudioCase): GeneratedStudioCase {
  const skill = draft.skill ?? defaultSkill();
  const adaptationNotes = draft.adaptationNotes ?? defaultAdaptationNotes(draft.caseFile);

  return {
    ...draft,
    origin: draft.origin ?? "generated-from-source",
    fairPlaySpine: draft.fairPlaySpine ?? defaultFairPlaySpine(draft.caseFile),
    adaptationNotes,
    validationReport: draft.validationReport ?? defaultValidationReport(draft.caseFile, skill),
    adaptationNotesMarkdown:
      draft.adaptationNotesMarkdown ?? defaultAdaptationNotesMarkdown(draft.caseFile, adaptationNotes),
    skill
  };
}

export function storeGeneratedStudioCase(draft: StoreGeneratedStudioCaseInput) {
  const skill = draft.skill ?? defaultSkill();
  const adaptationNotes = draft.adaptationNotes ?? defaultAdaptationNotes(draft.caseFile);
  const stored: GeneratedStudioCase = {
    ...draft,
    origin: draft.origin ?? "generated-from-source",
    fairPlaySpine: draft.fairPlaySpine ?? defaultFairPlaySpine(draft.caseFile),
    adaptationNotes,
    validationReport: draft.validationReport ?? defaultValidationReport(draft.caseFile, skill),
    adaptationNotesMarkdown:
      draft.adaptationNotesMarkdown ?? defaultAdaptationNotesMarkdown(draft.caseFile, adaptationNotes),
    skill,
    status: "draft",
    updatedAt: nowIso()
  };

  generatedCases.set(stored.caseFile.id, stored);
  persistStudioDraft(stored);
  return stored.caseFile.id;
}

export function getGeneratedStudioCase(caseId: string): GeneratedStudioCase | undefined {
  const cached = generatedCases.get(caseId);

  if (cached) {
    return cached;
  }

  const persistedDraft = loadPersistedStudioDraft(caseId);
  if (persistedDraft) {
    const normalized = normalizeGeneratedStudioCase(persistedDraft);
    generatedCases.set(caseId, normalized);
    return normalized;
  }

  const persistedPublished = loadPersistedPublishedCase(caseId);
  if (persistedPublished) {
    const normalized = normalizeGeneratedStudioCase(persistedPublished);
    generatedCases.set(caseId, normalized);
    return normalized;
  }

  return undefined;
}

export function saveGeneratedStudioCase(caseId: string): GeneratedStudioCase | undefined {
  const draft = getGeneratedStudioCase(caseId);

  if (!draft) {
    return undefined;
  }

  const saved: GeneratedStudioCase = {
    ...draft,
    status: draft.status === "published" ? "published" : "saved",
    updatedAt: nowIso()
  };

  generatedCases.set(caseId, saved);
  persistStudioDraft(saved);
  return saved;
}

export function publishGeneratedStudioCase(caseId: string): GeneratedStudioCase | undefined {
  const draft = getGeneratedStudioCase(caseId);

  if (!draft) {
    return undefined;
  }

  const published: GeneratedStudioCase = {
    ...draft,
    status: "published",
    updatedAt: nowIso(),
    publishedAt: nowIso()
  };

  generatedCases.set(caseId, published);
  persistStudioDraft(published);
  writePublishedCasePackage(published);
  return published;
}

export function getPublishedStudioCase(caseId: string): GeneratedStudioCase | undefined {
  const draft = getGeneratedStudioCase(caseId);

  return draft?.status === "published" ? draft : undefined;
}

export function getPublishedStudioCases(): GeneratedStudioCase[] {
  const published = new Map<string, GeneratedStudioCase>();

  listPersistedPublishedCases().forEach((draft) => {
    published.set(draft.caseFile.id, draft);
    generatedCases.set(draft.caseFile.id, draft);
  });
  [...generatedCases.values()]
    .filter((draft) => draft.status === "published")
    .forEach((draft) => {
      published.set(draft.caseFile.id, draft);
    });

  return [...published.values()];
}

export function clearGeneratedStudioCases() {
  generatedCases.clear();
}
