import { NextResponse } from "next/server";

import { getCaseShelfItems } from "../../../lib/case/catalog";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ cases: getCaseShelfItems() });
}
