import { describe, expect, it } from "vitest";

import { bundledCaseIds, getCaseShelfItems, isBundledCaseId } from "../lib/case/catalog";

describe("case catalog", () => {
  it("lists bundled cases as shelf-ready cards", () => {
    const items = getCaseShelfItems();

    expect(items.map((item) => item.id)).toEqual([...bundledCaseIds]);
    expect(items[0]).toMatchObject({
      title: "猎人小屋疑案",
      sourceTitle: "The Mystery of Hunter's Lodge",
      chapterCount: 3,
      agentCount: 6,
      difficulty: "标准"
    });
    expect(items[0].description.length).toBeGreaterThan(20);
    expect(items[0].cover?.alt).toBe("猎人小屋疑案 封面");

    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "speckled-band",
          title: "斑点带子疑案",
          sourceTitle: "The Adventure of the Speckled Band",
          difficulty: "标准"
        }),
        expect.objectContaining({
          id: "anne-rodway",
          title: "断领巾的证词",
          sourceTitle: "Brother Owen's Story of Anne Rodway",
          difficulty: "标准"
        }),
        expect.objectContaining({
          id: "rue-morgue",
          title: "莫格街双尸案",
          sourceTitle: "The Murders in the Rue Morgue",
          difficulty: "进阶"
        }),
        expect.objectContaining({
          id: "purloined-letter",
          title: "明处的信",
          sourceTitle: "The Purloined Letter",
          difficulty: "进阶"
        })
      ])
    );
  });

  it("guards unknown case ids", () => {
    expect(isBundledCaseId("hunters-lodge")).toBe(true);
    expect(isBundledCaseId("speckled-band")).toBe(true);
    expect(isBundledCaseId("anne-rodway")).toBe(true);
    expect(isBundledCaseId("rue-morgue")).toBe(true);
    expect(isBundledCaseId("purloined-letter")).toBe(true);
    expect(isBundledCaseId("missing-case")).toBe(false);
    expect(isBundledCaseId("unknown")).toBe(false);
  });
});
