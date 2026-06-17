import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { loadCasePackageFromDirectorySync } from "../case-package/loader";
import { casePackageSchema } from "../case-package/schema";
import { writeCasePackageToDirectorySync } from "../case-package/writer";
import type { CaseFile } from "../case/schema";
import type { GeneratedStudioCase } from "./generated-cases";

const draftFileName = "draft.json";
const studioMetadataFileName = "studio.json";

function dataRoot() {
  const configured = process.env.NEW_NOVELS_DATA_DIR;

  return configured
    ? resolve(/* turbopackIgnore: true */ configured)
    : join(/* turbopackIgnore: true */ process.cwd(), ".data");
}

function assertSafeCaseId(caseId: string) {
  if (!/^[a-z0-9][a-z0-9._-]*$/iu.test(caseId)) {
    throw new Error(`Unsafe case id: ${caseId}`);
  }
}

function writeJson(filePath: string, value: unknown) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function draftDirectory(caseId: string) {
  assertSafeCaseId(caseId);
  return join(dataRoot(), "studio-drafts", caseId);
}

function publishedDirectory(caseId: string) {
  assertSafeCaseId(caseId);
  return join(dataRoot(), "published-cases", caseId);
}

function createManifest(caseFile: CaseFile) {
  return {
    schemaVersion: "case-package/v1" as const,
    caseId: caseFile.id,
    title: caseFile.title,
    language: "zh-CN",
    entryChapterId: caseFile.chapters[0].id,
    createdBy: "new-novels-studio",
    source: {
      title: caseFile.source.title,
      author: caseFile.source.author,
      rightsNote: caseFile.source.publicDomainNote
    }
  };
}

function studioMetadata(draft: GeneratedStudioCase) {
  return {
    origin: draft.origin,
    sourceProfile: draft.sourceProfile,
    segmentation: draft.segmentation,
    fairPlaySpine: draft.fairPlaySpine,
    adaptationNotes: draft.adaptationNotes,
    qualityReport: draft.qualityReport,
    validationReport: draft.validationReport,
    skill: draft.skill,
    status: draft.status,
    updatedAt: draft.updatedAt,
    publishedAt: draft.publishedAt
  };
}

export function persistStudioDraft(draft: GeneratedStudioCase) {
  const directory = draftDirectory(draft.caseFile.id);
  const packageDirectory = join(directory, "package");
  const pkg = casePackageSchema.parse({
    manifest: createManifest(draft.caseFile),
    caseFile: draft.caseFile
  });

  mkdirSync(directory, { recursive: true });
  writeJson(join(directory, draftFileName), draft);
  writeJson(join(directory, studioMetadataFileName), studioMetadata(draft));
  writeCasePackageToDirectorySync(pkg, packageDirectory);
  writeJson(join(directory, "validation-report.json"), draft.validationReport);
  writeFileSync(join(directory, "adaptation-notes.md"), `${draft.adaptationNotesMarkdown.trim()}\n`, "utf8");
  loadCasePackageFromDirectorySync(packageDirectory);
}

export function loadPersistedStudioDraft(caseId: string): GeneratedStudioCase | undefined {
  const filePath = join(draftDirectory(caseId), draftFileName);

  if (!existsSync(filePath)) {
    return undefined;
  }

  return readJson<GeneratedStudioCase>(filePath);
}

export function writePublishedCasePackage(draft: GeneratedStudioCase) {
  const directory = publishedDirectory(draft.caseFile.id);
  const pkg = casePackageSchema.parse({
    manifest: createManifest(draft.caseFile),
    caseFile: draft.caseFile
  });

  writeCasePackageToDirectorySync(pkg, directory);
  writeJson(join(directory, studioMetadataFileName), studioMetadata(draft));
  writeJson(join(directory, "validation-report.json"), draft.validationReport);
  writeFileSync(join(directory, "adaptation-notes.md"), `${draft.adaptationNotesMarkdown.trim()}\n`, "utf8");
  loadCasePackageFromDirectorySync(directory);
}

export function loadPersistedPublishedCase(caseId: string): GeneratedStudioCase | undefined {
  const directory = publishedDirectory(caseId);

  if (!existsSync(join(directory, "manifest.json"))) {
    return undefined;
  }

  const caseFile = loadCasePackageFromDirectorySync(directory).caseFile;
  const metadataPath = join(directory, studioMetadataFileName);
  const metadata = existsSync(metadataPath)
    ? readJson<Omit<GeneratedStudioCase, "caseFile">>(metadataPath)
    : {
        sourceProfile: {
          title: caseFile.source.title,
          author: caseFile.source.author,
          language: "zh-CN",
          narrativeForm: "已发布案件包",
          structureNotes: ["该案件来自已发布的 case-package/v1。"],
          adaptationStrategy: ["按案件包配置运行。"],
          rightsNote: caseFile.source.publicDomainNote
        },
        origin: "uploaded-package" as const,
        segmentation: [],
        fairPlaySpine: {
          victim: caseFile.truth.victim,
          culprit: caseFile.truth.culprit,
          motive: caseFile.truth.motive,
          method: caseFile.truth.method,
          falseSolution: "已发布案件包未记录误导路径。",
          minimumClueChain: caseFile.truth.decisiveEvidence,
          decisiveContradictions: caseFile.contradictions.map((item) => item.title)
        },
        adaptationNotes: {
          summary: "该案件来自已发布的 case-package/v1。",
          readingStrategy: ["按案件包章节运行。"],
          investigationStrategy: ["按案件包线索、事实和揭示规则运行。"],
          npcStrategy: ["按案件包 agent 配置运行。"],
          actStructureStrategy: ["按案件包 acts、actGates 和 storyEvents 运行。"],
          unresolvedRisks: []
        },
        qualityReport: [],
        validationReport: {
          ok: true,
          generatedAt: new Date(0).toISOString(),
          skillName: "new-novels-case-adapter",
          skillVersion: "new-novels-case-adapter/v1",
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
        },
        adaptationNotesMarkdown: `# ${caseFile.title} 改写说明\n\n该案件来自已发布的 case-package/v1。\n`,
        skill: {
          name: "new-novels-case-adapter" as const,
          version: "new-novels-case-adapter/v1",
          loadedFiles: []
        },
        status: "published" as const,
        updatedAt: new Date(0).toISOString(),
        publishedAt: new Date(0).toISOString()
      };

  return {
    ...metadata,
    status: "published",
    caseFile
  };
}

export function listPersistedPublishedCases(): GeneratedStudioCase[] {
  const directory = join(dataRoot(), "published-cases");

  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadPersistedPublishedCase(entry.name))
    .filter((draft): draft is GeneratedStudioCase => Boolean(draft));
}

export function deletePersistedStudioDraft(caseId: string) {
  rmSync(draftDirectory(caseId), { recursive: true, force: true });
}
