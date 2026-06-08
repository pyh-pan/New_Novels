import { describe, expect, it } from "vitest";
import { checkAccusationAnswer } from "../lib/game/accusation";
import { loadBundledCase } from "../lib/case/default-case";

const huntersLodgeCase = loadBundledCase("hunters-lodge");

describe("checkAccusationAnswer", () => {
  it("accepts direct matching answers", () => {
    const question = huntersLodgeCase.accusation.questions[0];
    expect(checkAccusationAnswer(question, "佐伊和罗杰").correct).toBe(true);
  });

  it("accepts answers that contain an accepted phrase", () => {
    const question = huntersLodgeCase.accusation.questions[1];
    expect(checkAccusationAnswer(question, "关键是佐伊伪装成米德尔顿").correct).toBe(true);
  });

  it("rejects negated accepted culprit answers", () => {
    const question = huntersLodgeCase.accusation.questions[0];
    expect(checkAccusationAnswer(question, "不是佐伊和罗杰，是黑胡子访客").correct).toBe(false);
    expect(checkAccusationAnswer(question, "不是哈弗林夫妇").correct).toBe(false);
  });

  it("rejects negated accepted method answers", () => {
    const question = huntersLodgeCase.accusation.questions[1];
    expect(checkAccusationAnswer(question, "不是佐伊伪装成米德尔顿").correct).toBe(false);
  });

  it("rejects incorrect answers", () => {
    const question = huntersLodgeCase.accusation.questions[0];
    expect(checkAccusationAnswer(question, "贾普探长").correct).toBe(false);
  });
});
