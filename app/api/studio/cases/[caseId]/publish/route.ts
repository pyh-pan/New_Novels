import { NextResponse } from "next/server";

import { clearPlayableCaseRuntime } from "../../../../../../lib/case/playable-case";
import { publishGeneratedStudioCase } from "../../../../../../lib/studio/generated-cases";

type StudioCaseActionRouteProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function POST(_request: Request, { params }: StudioCaseActionRouteProps) {
  const { caseId } = await params;
  const draft = publishGeneratedStudioCase(caseId);

  if (!draft) {
    return NextResponse.json({ error: "Unknown draft." }, { status: 404 });
  }

  clearPlayableCaseRuntime(caseId);

  return NextResponse.json({
    caseId,
    status: draft.status,
    updatedAt: draft.updatedAt,
    publishedAt: draft.publishedAt,
    playHref: `/cases/${caseId}`
  });
}
