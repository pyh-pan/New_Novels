import type { CaseFile } from "./schema";
import { loadBundledCase } from "./default-case";
import { getPublishedStudioCases } from "../studio/generated-cases";

export type CaseShelfItem = {
  id: string;
  title: string;
  sourceTitle: string;
  author: string;
  description: string;
  chapterCount: number;
  agentCount: number;
  clueCount: number;
  actCount: number;
  difficulty: "入门" | "标准" | "进阶";
  estimatedMinutes: number;
  tags: string[];
  cover?: {
    imagePath?: string;
    alt: string;
    palette: {
      background: string;
      foreground: string;
    };
  };
};

export const bundledCaseIds = ["hunters-lodge", "hammer-of-god"] as const;
export type BundledCaseId = (typeof bundledCaseIds)[number];

const caseTags: Record<BundledCaseId, string[]> = {
  "hunters-lodge": ["身份伪装", "证词矛盾", "不在场证明"],
  "hammer-of-god": ["本格谜题", "物理手法", "心理谎言"]
};

const caseDifficulty: Record<BundledCaseId, CaseShelfItem["difficulty"]> = {
  "hunters-lodge": "标准",
  "hammer-of-god": "入门"
};

const casePalettes: Record<
  BundledCaseId,
  NonNullable<CaseShelfItem["cover"]>["palette"]
> = {
  "hunters-lodge": {
    background: "#efe8d8",
    foreground: "#171512"
  },
  "hammer-of-god": {
    background: "#e8e3d7",
    foreground: "#181715"
  }
};

function createDescription(caseFile: CaseFile) {
  const firstChapter = caseFile.chapters[0]?.body ?? caseFile.storyText;
  return firstChapter
    .replace(/\s+/g, " ")
    .slice(0, 94)
    .trim();
}

export function caseToShelfItem(caseFile: CaseFile): CaseShelfItem {
  const id = caseFile.id as BundledCaseId;

  return {
    id: caseFile.id,
    title: caseFile.title,
    sourceTitle: caseFile.source.title,
    author: caseFile.source.author,
    description: createDescription(caseFile),
    chapterCount: caseFile.chapters.length,
    agentCount: caseFile.agents.length,
    clueCount: caseFile.clues.length,
    actCount: caseFile.acts.length,
    difficulty: caseDifficulty[id] ?? "标准",
    estimatedMinutes: Math.max(25, caseFile.chapters.length * 18),
    tags: caseTags[id] ?? ["推理", "互动小说"],
    cover: {
      alt: `${caseFile.title} 封面`,
      palette: casePalettes[id] ?? {
        background: "#f3efe6",
        foreground: "#181715"
      }
    }
  };
}

export function getCaseShelfItems(): CaseShelfItem[] {
  return [
    ...bundledCaseIds.map((caseId) => caseToShelfItem(loadBundledCase(caseId))),
    ...getPublishedCaseShelfItems()
  ];
}

export function getPublishedCaseShelfItems(): CaseShelfItem[] {
  return getPublishedStudioCases().map((draft) => caseToShelfItem(draft.caseFile));
}

export function isBundledCaseId(caseId: string): caseId is BundledCaseId {
  return bundledCaseIds.includes(caseId as BundledCaseId);
}
