import { join } from "node:path";

import { createAgentRuntime } from "../agent-runtime";
import { loadCasePackageFromDirectorySync } from "../case-package/loader";
import type { CaseFile } from "./schema";

const bundledCaseIds = ["hammer-of-god", "hunters-lodge"] as const;
const fallbackCaseId = "hunters-lodge";

const cachedCases = new Map<string, CaseFile>();
const cachedRuntimes = new Map<string, ReturnType<typeof createAgentRuntime>>();

export function getDefaultCaseId(): string {
  const configured = process.env.APP_DEFAULT_CASE_ID?.trim();

  return configured && bundledCaseIds.includes(configured as (typeof bundledCaseIds)[number])
    ? configured
    : fallbackCaseId;
}

export function loadBundledCase(caseId: string): CaseFile {
  if (!bundledCaseIds.includes(caseId as (typeof bundledCaseIds)[number])) {
    throw new Error(`Unknown bundled case: ${caseId}`);
  }

  const cached = cachedCases.get(caseId);
  if (cached) {
    return cached;
  }

  const caseDirectory = join(process.cwd(), "cases", caseId);
  const caseFile = loadCasePackageFromDirectorySync(caseDirectory).caseFile;
  cachedCases.set(caseId, caseFile);
  return caseFile;
}

export function getDefaultCase(): CaseFile {
  return loadBundledCase(getDefaultCaseId());
}

export function getDefaultRuntime() {
  return getRuntimeForCase(getDefaultCaseId());
}

export function getRuntimeForCase(caseId: string) {
  const cached = cachedRuntimes.get(caseId);
  if (cached) {
    return cached;
  }

  const runtime = createAgentRuntime(loadBundledCase(caseId));
  cachedRuntimes.set(caseId, runtime);
  return runtime;
}
