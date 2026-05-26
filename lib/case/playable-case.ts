import { createAgentRuntime } from "../agent-runtime";
import { getPublishedStudioCase } from "../studio/generated-cases";
import { getDefaultCaseId, loadBundledCase } from "./default-case";
import type { CaseFile } from "./schema";

const runtimeCache = new Map<string, ReturnType<typeof createAgentRuntime>>();

export function loadPlayableCase(caseId?: string): CaseFile {
  const resolvedCaseId = caseId ?? getDefaultCaseId();

  try {
    return loadBundledCase(resolvedCaseId);
  } catch {
    const published = getPublishedStudioCase(resolvedCaseId);

    if (!published) {
      throw new Error(`Unknown playable case: ${resolvedCaseId}`);
    }

    return published.caseFile;
  }
}

export function getRuntimeForPlayableCase(caseId?: string) {
  const caseFile = loadPlayableCase(caseId);
  const cached = runtimeCache.get(caseFile.id);

  if (cached) {
    return cached;
  }

  const runtime = createAgentRuntime(caseFile);
  runtimeCache.set(caseFile.id, runtime);
  return runtime;
}

export function clearPlayableCaseRuntime(caseId: string) {
  runtimeCache.delete(caseId);
}
