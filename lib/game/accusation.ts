import type { AccusationQuestion } from "../case/schema";
import type { AccusationCheckResult } from "./types";

function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

const negationMarkers = ["而不是", "不是", "并非", "没有", "无关", "不", "没"];
const negationWindowSize = 10;
const clauseSeparators = /[，。；、！？,.!?;:：]/;

function isNegatedMatch(answer: string, matchIndex: number): boolean {
  const prefix = answer.slice(Math.max(0, matchIndex - negationWindowSize), matchIndex);
  const localPrefix = prefix.split(clauseSeparators).at(-1) ?? prefix;

  return negationMarkers.some((marker) => localPrefix.includes(marker));
}

export function checkAccusationAnswer(
  question: AccusationQuestion,
  answer: string
): AccusationCheckResult {
  const normalizedAnswer = normalizeAnswer(answer);
  const correct = question.acceptedAnswers.some((accepted) => {
    const normalizedAccepted = normalizeAnswer(accepted);
    const matchIndex = normalizedAnswer.indexOf(normalizedAccepted);

    return matchIndex >= 0 && !isNegatedMatch(normalizedAnswer, matchIndex);
  });

  return correct ? { correct: true, explanation: question.explanation } : { correct: false };
}
