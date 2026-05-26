import { NextResponse } from "next/server";

import { createSourceDraftJob } from "../../../../lib/studio/jobs";

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => undefined);
  const file = formData?.get("file");

  if (
    !file ||
    typeof file !== "object" ||
    typeof (file as { name?: unknown }).name !== "string"
  ) {
    return NextResponse.json({ error: "Missing source file." }, { status: 400 });
  }

  const fileName = (file as File).name;
  if (!/\.(txt|md)$/i.test(fileName)) {
    return NextResponse.json({ error: "Only .txt and .md files are supported." }, { status: 400 });
  }

  return NextResponse.json(createSourceDraftJob(fileName));
}
