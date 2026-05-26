import { NextResponse } from "next/server";

import { getCaseShelfItems } from "../../../lib/case/catalog";

export function GET() {
  return NextResponse.json({ cases: getCaseShelfItems() });
}
