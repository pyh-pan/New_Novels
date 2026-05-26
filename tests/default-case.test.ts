import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  getDefaultCase,
  getDefaultRuntime,
  loadBundledCase
} from "../lib/case/default-case";

describe("default case", () => {
  it("loads the runnable case from the filesystem package", () => {
    const caseFile = getDefaultCase();
    const markdownBody = readFileSync(
      join(process.cwd(), "cases", "hunters-lodge", "story", "chapter-1.md"),
      "utf8"
    );

    expect(caseFile.id).toBe("hunters-lodge");
    expect(caseFile.chapters[0].body).toBe(markdownBody.trim());
    expect(caseFile.actGates.map((gate) => gate.id)).toContain("gate-opening-to-testimony");
  });

  it("creates the default runtime from the loaded package", () => {
    const runtime = getDefaultRuntime();

    expect(runtime.caseFile.id).toBe("hunters-lodge");
    expect(runtime.getAgent("general")?.name).toBe("调查助手");
    expect(runtime.route("我想问佐伊有没有看清访客").targetId).toBe("zoe");
  });

  it("ships Hunter's Lodge as a publication-grade story sample, not a synopsis", () => {
    const caseFile = getDefaultCase();
    const chaptersById = new Map(caseFile.chapters.map((chapter) => [chapter.id, chapter]));

    expect(chaptersById.get("chapter-1")?.body.length).toBeGreaterThan(1800);
    expect(chaptersById.get("chapter-2")?.body.length).toBeGreaterThan(1800);
    expect(chaptersById.get("chapter-3")?.body.length).toBeGreaterThan(1000);
    expect(caseFile.storyText).not.toContain("剧情摘要");
    expect(caseFile.chapters.map((chapter) => chapter.body).join("\n")).not.toContain(
      "米德尔顿太太并不是独立存在的证人"
    );
  });

  it("can still load the original Hammer of God demo package", () => {
    expect(loadBundledCase("hammer-of-god").id).toBe("hammer-of-god");
  });
});
