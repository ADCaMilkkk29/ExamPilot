import { NextRequest, NextResponse } from "next/server";
import { listDocuments } from "@/lib/docs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams;
  return NextResponse.json(listDocuments(query.get("keyword") ?? "", query.get("q") ?? ""));
}
