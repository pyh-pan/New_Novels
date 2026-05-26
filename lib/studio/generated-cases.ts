import type { CaseFile } from "../case/schema";
import type {
  AdaptationQualityItem,
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
  sourceProfile: SourceProfile;
  segmentation: SourceSegmentationItem[];
  qualityReport: AdaptationQualityItem[];
  status: "draft" | "saved" | "published";
  updatedAt: string;
  publishedAt?: string;
};

const generatedCases = new Map<string, GeneratedStudioCase>();

type StoreGeneratedStudioCaseInput = Omit<
  GeneratedStudioCase,
  "status" | "updatedAt" | "publishedAt"
>;

function nowIso() {
  return new Date().toISOString();
}

export function storeGeneratedStudioCase(draft: StoreGeneratedStudioCaseInput) {
  const stored: GeneratedStudioCase = {
    ...draft,
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
    generatedCases.set(caseId, persistedDraft);
    return persistedDraft;
  }

  const persistedPublished = loadPersistedPublishedCase(caseId);
  if (persistedPublished) {
    generatedCases.set(caseId, persistedPublished);
    return persistedPublished;
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
