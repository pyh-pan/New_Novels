import { join } from "node:path";

import { createAgentRuntime } from "../agent-runtime";
import { loadCasePackageFromDirectorySync } from "../case-package/loader";
import type { CaseFile } from "./schema";

const defaultCaseDirectory = join(process.cwd(), "cases", "hammer-of-god");

let cachedCase: CaseFile | undefined;
let cachedRuntime: ReturnType<typeof createAgentRuntime> | undefined;

export function getDefaultCase(): CaseFile {
  cachedCase ??= loadCasePackageFromDirectorySync(defaultCaseDirectory).caseFile;
  return cachedCase;
}

export function getDefaultRuntime() {
  cachedRuntime ??= createAgentRuntime(getDefaultCase());
  return cachedRuntime;
}
