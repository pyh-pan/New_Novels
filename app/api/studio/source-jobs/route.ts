import { NextResponse } from "next/server";

import { createSourceDraftJob } from "../../../../lib/studio/jobs";
import { extractSourceDocument } from "../../../../lib/studio/source-adaptation";

export const runtime = "nodejs";

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
  if (!/\.(txt|md|pdf)$/i.test(fileName)) {
    return NextResponse.json({ error: "Only .txt, .md and .pdf files are supported." }, { status: 400 });
  }

  try {
    const source = await extractSourceDocument(file as File);
    return NextResponse.json(await createSourceDraftJob(source));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Source file could not be parsed.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
