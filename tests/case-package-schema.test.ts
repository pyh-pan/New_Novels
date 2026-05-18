import { describe, expect, it } from "vitest";

import { casePackageManifestSchema, casePackageSchema } from "../lib/case-package/schema";
import { hammerOfGodPackage } from "../lib/case-package/hammer-of-god-package";

describe("case package schema", () => {
  it("validates the Hammer of God package contract", () => {
    const parsed = casePackageSchema.parse(hammerOfGodPackage);

    expect(parsed.manifest.schemaVersion).toBe("case-package/v1");
    expect(parsed.caseFile.facts.map((fact) => fact.id)).toContain("fact-small-hammer-weight");
    expect(parsed.caseFile.acts.map((act) => act.id)).toContain("act-opening");
    expect(parsed.caseFile.scenes.map((scene) => scene.id)).toContain("scene-smithy-road");
    expect(parsed.manifest.entryChapterId).toBe("chapter-1");
    expect(parsed.caseFile.chapters[0].body).toContain("海泽尔村");
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
