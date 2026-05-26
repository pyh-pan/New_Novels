import { NextResponse } from "next/server";

import { saveGeneratedStudioCase } from "../../../../../../lib/studio/generated-cases";

type StudioCaseActionRouteProps = {
  params: Promise<{
    caseId: string;
  }>;
};

export async function POST(_request: Request, { params }: StudioCaseActionRouteProps) {
  const { caseId } = await params;
  const draft = saveGeneratedStudioCase(caseId);

  if (!draft) {
    return NextResponse.json({ error: "Unknown draft." }, { status: 404 });
  }

  return NextResponse.json({
    caseId,
    status: draft.status,
    updatedAt: draft.updatedAt
  });
}
