import { describe, expect, it } from "vitest";
import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  loadCasePackageFromDirectory,
  validateCasePackageDirectory
} from "../lib/case-package/loader";

const hammerDirectory = join(process.cwd(), "cases", "hammer-of-god");

describe("case package directory loader", () => {
  it("loads the Hammer of God case package from split filesystem files", async () => {
    const loaded = await loadCasePackageFromDirectory(hammerDirectory);

    expect(loaded.manifest.schemaVersion).toBe("case-package/v1");
    expect(loaded.caseFile.id).toBe("hammer-of-god");
    expect(loaded.caseFile.chapters.map((chapter) => chapter.id)).toEqual([
      "chapter-1",
      "chapter-2",
      "chapter-3"
    ]);
    expect(loaded.caseFile.acts.map((act) => act.id)).toEqual([
      "act-opening",
      "act-testimony",
      "act-confrontation"
    ]);
    expect(loaded.caseFile.actGates.map((gate) => gate.id)).toEqual([
      "gate-opening-to-testimony",
      "gate-testimony-to-confrontation"
    ]);
    expect(loaded.caseFile.agents.find((agent) => agent.id === "wilfred")).toMatchObject({
      type: "npc",
      pressureProfile: expect.objectContaining({
        thresholds: { guarded: 2, cornered: 5 }
      })
    });
  });

  it("uses split chapter markdown instead of trusting the aggregate snapshot", async () => {
    const tempDirectory = await mkdtemp(join(tmpdir(), "new-novels-case-"));
    try {
      await cp(hammerDirectory, tempDirectory, { recursive: true });
      await writeFile(
        join(tempDirectory, "story", "chapter-1.md"),
        "拆分章节正文来自 markdown 文件。"
      );

      const loaded = await loadCasePackageFromDirectory(tempDirectory);

      expect(loaded.caseFile.chapters[0].body).toBe("拆分章节正文来自 markdown 文件。");
    } finally {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("returns a structured validation report for malformed package directories", async () => {
    const report = await validateCasePackageDirectory(
      join(process.cwd(), "cases", "missing-case")
    );

    expect(report.ok).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "fatal",
          filePath: "manifest.json",
          code: "missing-file"
        })
      ])
    );
  });
});
