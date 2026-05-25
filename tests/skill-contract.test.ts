import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const skillRoot = join(process.cwd(), "skills", "new-novels-case-adapter");

describe("new novels case adapter skill contract", () => {
  it("requires runtime-ready pressure and act-gate design", () => {
    const skill = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
    const packageReference = readFileSync(
      join(skillRoot, "references", "case-package-v1.md"),
      "utf8"
    );
    const workflow = readFileSync(
      join(skillRoot, "references", "novel-to-case-workflow.md"),
      "utf8"
    );
    const checker = readFileSync(
      join(skillRoot, "scripts", "check_case_package_refs.mjs"),
      "utf8"
    );

    expect(skill).toContain("pressureProfile");
    expect(skill).toContain("ActGate");
    expect(skill).toContain("required discoveries");
    expect(skill).toContain("truth/truth.json");
    expect(packageReference).toContain("pressureProfile");
    expect(packageReference).toContain("actGates");
    expect(packageReference).toContain("agents/global-context.json");
    expect(workflow).toContain("剧本杀式");
    expect(workflow).toContain("pressureProfile");
    expect(workflow).toContain("Package Assembly");
    expect(checker).toContain("case-package-directory");
  });
});
