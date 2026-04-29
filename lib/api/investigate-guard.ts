import { hammerOfGodCase } from "../case/hammer-of-god";
import type { CaseAgent } from "../case/schema";

export const SAFE_INVESTIGATION_FALLBACK = "我暂时无法回答这个问题。";

const maxResponseLength = 600;
const truthSensitiveStrings = [
  "威尔弗里德是真凶",
  "真凶是威尔弗里德",
  "凶手是威尔弗里德",
  "威尔弗里德牧师是真凶",
  "真凶是威尔弗里德牧师",
  "凶手是威尔弗里德牧师",
  "从钟楼扔下小锤",
  "从钟楼高处让小锤坠落",
  "利用钟楼高度和重力",
  "完整作案方式",
  hammerOfGodCase.truth.method,
  hammerOfGodCase.truth.motive
];
const fabricatedEvidenceStrings = [
  "新的书信",
  "一封书信",
  "脚印",
  "新证物",
  "新的证物",
  "新证据",
  "新的证据",
  "另有目击者",
  "隐藏的目击者"
];

function forbiddenClaimFragments(claims: string[]): string[] {
  return claims
    .map((claim) =>
      claim
        .replace(/^不得/, "")
        .replace(/^直接/, "")
        .replace(/^主动/, "")
        .replace(/。$/u, "")
        .trim()
    )
    .filter((claim) => claim.length >= 4);
}

export function guardInvestigationOutput(
  content: string | null | undefined,
  target: CaseAgent
): string {
  const trimmed = content?.trim() ?? "";

  if (trimmed.length === 0 || trimmed.length > maxResponseLength) {
    return SAFE_INVESTIGATION_FALLBACK;
  }

  const forbiddenClaims =
    target.type === "general" ? target.forbiddenClaims : target.boundaries.forbiddenClaims;
  const blockedStrings = [
    ...truthSensitiveStrings,
    ...fabricatedEvidenceStrings,
    ...forbiddenClaimFragments(forbiddenClaims)
  ];

  if (blockedStrings.some((blocked) => blocked.length > 0 && trimmed.includes(blocked))) {
    return SAFE_INVESTIGATION_FALLBACK;
  }

  return trimmed;
}
