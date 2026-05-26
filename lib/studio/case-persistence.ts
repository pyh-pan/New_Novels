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
    sourceProfile: draft.sourceProfile,
    segmentation: draft.segmentation,
    qualityReport: draft.qualityReport,
    status: draft.status,
    updatedAt: draft.updatedAt,
    publishedAt: draft.publishedAt
  };
}

export function persistStudioDraft(draft: GeneratedStudioCase) {
  const directory = draftDirectory(draft.caseFile.id);
  mkdirSync(directory, { recursive: true });
  writeJson(join(directory, draftFileName), draft);
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
        segmentation: [],
        qualityReport: [],
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
