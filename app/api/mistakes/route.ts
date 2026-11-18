import { NextResponse } from "next/server";
import { listMistakes } from "@/lib/mistakes";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ mistakes: listMistakes() });
}
