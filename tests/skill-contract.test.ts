import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
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
    const runnerContract = readFileSync(
      join(skillRoot, "references", "studio-runner-contract.md"),
      "utf8"
    );

    expect(skill).toContain("Studio runner");
    expect(skill).toContain("validation-report.json");
    expect(skill).toContain("adaptation-notes.md");
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
    expect(runnerContract).toContain("AdaptationRequest");
    expect(runnerContract).toContain("AdaptationModelOutput");
    expect(runnerContract).toContain("generated-from-source");
    expect(runnerContract).toContain("uploaded-package");
    expect(checker).toContain("case-package-directory");
    expect(checker).toContain("--json");
    expect(checker).toContain("validation-report.json");
    expect(checker).toContain("adaptation-notes.md");
  });

  it("requires source segmentation that preserves reading while hiding investigation", () => {
    const skill = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
    const workflow = readFileSync(
      join(skillRoot, "references", "novel-to-case-workflow.md"),
      "utf8"
    );
    const packageReference = readFileSync(
      join(skillRoot, "references", "case-package-v1.md"),
      "utf8"
    );

    expect(skill).toContain("story-keep");
    expect(skill).toContain("investigation-hide");
    expect(skill).toContain("deduction-hide");
    expect(skill).toContain("bridge-rewrite");
    expect(workflow).toContain("Source Segmentation Pass");
    expect(workflow).toContain("Investigation Extraction Map");
    expect(workflow).toContain("阅读保留率");
    expect(packageReference).toContain("story-keep");
    expect(packageReference).toContain("可探索入口");
  });

  it("does not anchor the adapter skill to specific bundled case packages", () => {
    const skill = readFileSync(join(skillRoot, "SKILL.md"), "utf8");

    expect(skill).not.toContain("cases/hunters-lodge");
    expect(skill).not.toContain("cases/hammer-of-god");
    expect(skill).not.toContain("Hunter's Lodge");
    expect(skill).not.toContain("The Mystery of Hunter");
    expect(skill).toContain("不要把任何既有案件目录作为内容模板");
  });

  it("requires publication-grade adaptation rather than demo summaries", () => {
    const skill = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
    const workflow = readFileSync(
      join(skillRoot, "references", "novel-to-case-workflow.md"),
      "utf8"
    );

    expect(skill).toContain("publication-grade");
    expect(skill).toContain("not a demo");
    expect(skill).toContain("editorial pass");
    expect(skill).toContain("reader-player validation");
    expect(workflow).toContain("Publication-Grade Rewrite Pass");
    expect(workflow).toContain("Demo Summary Prohibition");
    expect(workflow).toContain("发行级");
    expect(workflow).toContain("读者-玩家双重验收");
  });

  it("requires story event classification for time and consequence design", () => {
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

    for (const text of [skill, packageReference, workflow]) {
      expect(text).toContain("storyEvents");
      expect(text).toContain("instant-result");
      expect(text).toContain("agent-state-change");
      expect(text).toContain("story-beat");
      expect(text).toContain("act-transition");
    }
    expect(skill).toContain("查账单");
    expect(skill).toContain("不推进故事时间");
    expect(workflow).toContain("因果顺序");
    expect(checker).toContain("storyEvents");
    expect(checker).toContain("events/story-events.json");
  });

  it("emits a machine-readable validation report from the bundled package", () => {
    const result = spawnSync(
      process.execPath,
      [
        join(skillRoot, "scripts", "check_case_package_refs.mjs"),
        "--json",
        join(process.cwd(), "cases", "hunters-lodge")
      ],
      { encoding: "utf8" }
    );

    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout) as {
      ok: boolean;
      summary: { agents: number; storyEvents: number };
      issues: unknown[];
    };

    expect(report.ok).toBe(true);
    expect(report.summary.agents).toBeGreaterThan(0);
    expect(report.summary.storyEvents).toBeGreaterThan(0);
    expect(report.issues).toEqual([]);
  });
});
