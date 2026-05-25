import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  getDefaultCase,
  getDefaultRuntime
} from "../lib/case/default-case";

describe("default case", () => {
  it("loads the runnable case from the filesystem package", () => {
    const caseFile = getDefaultCase();
    const markdownBody = readFileSync(
      join(process.cwd(), "cases", "hammer-of-god", "story", "chapter-1.md"),
      "utf8"
    );

    expect(caseFile.id).toBe("hammer-of-god");
    expect(caseFile.chapters[0].body).toBe(markdownBody.trim());
    expect(caseFile.actGates.map((gate) => gate.id)).toContain("gate-opening-to-testimony");
  });

  it("creates the default runtime from the loaded package", () => {
    const runtime = getDefaultRuntime();

    expect(runtime.caseFile.id).toBe("hammer-of-god");
    expect(runtime.getAgent("general")?.name).toBe("调查助手");
    expect(runtime.route("我想问牧师在哪里").targetId).toBe("wilfred");
  });
});
