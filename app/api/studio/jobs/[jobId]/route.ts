import { NextResponse } from "next/server";

import { getSourceDraftJob } from "../../../../../lib/studio/jobs";

type StudioJobRouteProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export async function GET(_request: Request, { params }: StudioJobRouteProps) {
  const { jobId } = await params;

  return NextResponse.json(getSourceDraftJob(jobId));
}
