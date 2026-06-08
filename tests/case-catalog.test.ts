import { describe, expect, it } from "vitest";

import { getCaseShelfItems, isBundledCaseId } from "../lib/case/catalog";

describe("case catalog", () => {
  it("lists bundled cases as shelf-ready cards", () => {
    const items = getCaseShelfItems();

    expect(items.map((item) => item.id)).toEqual(["hunters-lodge"]);
    expect(items[0]).toMatchObject({
      title: "猎人小屋疑案",
      sourceTitle: "The Mystery of Hunter's Lodge",
      chapterCount: 3,
      agentCount: 6,
      difficulty: "标准"
    });
    expect(items[0].description.length).toBeGreaterThan(20);
    expect(items[0].cover?.alt).toBe("猎人小屋疑案 封面");
  });

  it("guards unknown case ids", () => {
    expect(isBundledCaseId("hunters-lodge")).toBe(true);
    expect(isBundledCaseId("missing-case")).toBe(false);
    expect(isBundledCaseId("unknown")).toBe(false);
  });
});
