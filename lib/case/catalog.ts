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

export const bundledCaseIds = [
  "hunters-lodge",
  "speckled-band",
  "anne-rodway",
  "rue-morgue",
  "purloined-letter"
] as const;
export type BundledCaseId = (typeof bundledCaseIds)[number];

const caseTags: Record<BundledCaseId, string[]> = {
  "hunters-lodge": ["身份伪装", "证词矛盾", "不在场证明"],
  "speckled-band": ["乡宅惊悚", "遗产动机", "密室疑云"],
  "anne-rodway": ["证物追踪", "证词链", "伦敦贫民区"],
  "rue-morgue": ["密室", "证词矛盾", "非人真相"],
  "purloined-letter": ["政治勒索", "明处藏匿", "方法推理"]
};

const caseDifficulty: Record<BundledCaseId, CaseShelfItem["difficulty"]> = {
  "hunters-lodge": "标准",
  "speckled-band": "标准",
  "anne-rodway": "标准",
  "rue-morgue": "进阶",
  "purloined-letter": "进阶"
};

const casePalettes: Record<
  BundledCaseId,
  NonNullable<CaseShelfItem["cover"]>["palette"]
> = {
  "hunters-lodge": {
    background: "#efe8d8",
    foreground: "#171512"
  },
  "speckled-band": {
    background: "#e8eadf",
    foreground: "#151813"
  },
  "anne-rodway": {
    background: "#eee6df",
    foreground: "#1b1513"
  },
  "rue-morgue": {
    background: "#e5e8ec",
    foreground: "#12161b"
  },
  "purloined-letter": {
    background: "#ece8d5",
    foreground: "#17150f"
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
