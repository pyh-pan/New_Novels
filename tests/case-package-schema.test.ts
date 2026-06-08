import { describe, expect, it } from "vitest";
import { join } from "node:path";

import { loadCasePackageFromDirectorySync } from "../lib/case-package/loader";
import { casePackageManifestSchema, casePackageSchema } from "../lib/case-package/schema";

describe("case package schema", () => {
  it("validates the Hunter's Lodge package contract", () => {
    const parsed = casePackageSchema.parse(
      loadCasePackageFromDirectorySync(join(process.cwd(), "cases", "hunters-lodge"))
    );

    expect(parsed.manifest.schemaVersion).toBe("case-package/v1");
    expect(parsed.caseFile.facts.map((fact) => fact.id)).toContain("fact-missing-revolver");
    expect(parsed.caseFile.acts.map((act) => act.id)).toContain("act-opening");
    expect(parsed.caseFile.scenes.map((scene) => scene.id)).toContain("scene-gun-room");
    expect(parsed.manifest.entryChapterId).toBe("chapter-1");
    expect(parsed.caseFile.chapters[0].body).toContain("波洛病倒");
  });

  it("rejects unsupported package versions", () => {
    expect(() =>
      casePackageManifestSchema.parse({
        schemaVersion: "case-package/v999",
        caseId: "x",
        title: "x",
        language: "zh-CN",
        entryChapterId: "chapter-01",
        createdBy: "test",
        source: {
          title: "Source",
          author: "Author",
          rightsNote: "Rights"
        }
      })
    ).toThrow();
  });
});
