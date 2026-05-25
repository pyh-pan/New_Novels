import { NextResponse } from "next/server";
import { z } from "zod";

import { parseJsonRequest } from "../../../lib/api/request";
import { getDefaultCase } from "../../../lib/case/default-case";
import { checkAccusationAnswer } from "../../../lib/game/accusation";

const requestSchema = z.object({
  questionIndex: z.number().int().min(0),
  answer: z.string().trim().min(1)
});

export async function GET() {
  const firstQuestion = getDefaultCase().accusation.questions[0];

  return NextResponse.json({
    questionIndex: 0,
    prompt: firstQuestion.prompt
  });
}

export async function POST(request: Request) {
  const parsed = await parseJsonRequest(request, requestSchema);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { questionIndex, answer } = parsed.data;
  const question = getDefaultCase().accusation.questions[questionIndex];

  if (!question) {
    return NextResponse.json({ status: "wrong" });
  }

  const result = checkAccusationAnswer(question, answer);

  if (!result.correct) {
    return NextResponse.json({ status: "wrong" });
  }

  const nextIndex = questionIndex + 1;
  const caseFile = getDefaultCase();
  const nextQuestion = caseFile.accusation.questions[nextIndex];

  if (!nextQuestion) {
    const culprit = caseFile.agents.find((agent) => agent.id === caseFile.truth.culprit);

    return NextResponse.json({
      status: "solved",
      truth: {
        culpritName: culprit?.name ?? caseFile.truth.culprit,
        method: caseFile.truth.method,
        motive: caseFile.truth.motive,
        decisiveEvidence: caseFile.truth.decisiveEvidence
      }
    });
  }

  return NextResponse.json({
    status: "next",
    questionIndex: nextIndex,
    prompt: nextQuestion.prompt
  });
}
