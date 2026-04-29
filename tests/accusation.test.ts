import { describe, expect, it } from "vitest";
import { checkAccusationAnswer } from "../lib/game/accusation";
import { hammerOfGodCase } from "../lib/case/hammer-of-god";

describe("checkAccusationAnswer", () => {
  it("accepts direct matching answers", () => {
    const question = hammerOfGodCase.accusation.questions[0];
    expect(checkAccusationAnswer(question, "威尔弗里德牧师").correct).toBe(true);
  });

  it("accepts answers that contain an accepted phrase", () => {
    const question = hammerOfGodCase.accusation.questions[1];
    expect(checkAccusationAnswer(question, "他从钟楼扔下小锤，利用重力杀人").correct).toBe(true);
  });

  it("rejects negated accepted culprit answers", () => {
    const question = hammerOfGodCase.accusation.questions[0];
    expect(checkAccusationAnswer(question, "不是威尔弗里德，是铁匠西米恩").correct).toBe(false);
    expect(checkAccusationAnswer(question, "不是威尔弗里德牧师").correct).toBe(false);
  });

  it("rejects negated accepted method answers", () => {
    const question = hammerOfGodCase.accusation.questions[1];
    expect(checkAccusationAnswer(question, "不是从钟楼扔下小锤").correct).toBe(false);
  });

  it("rejects incorrect answers", () => {
    const question = hammerOfGodCase.accusation.questions[0];
    expect(checkAccusationAnswer(question, "铁匠西米恩").correct).toBe(false);
  });
});
