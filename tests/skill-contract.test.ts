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
});
