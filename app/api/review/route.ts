import { NextRequest, NextResponse } from "next/server";
import { reviewDocuments } from "@/lib/review";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const input = await request.json().catch(() => null);
  if (!Array.isArray(input?.docIds) || !input.docIds.every((id: unknown) =>
    typeof id === "number" && Number.isSafeInteger(id) && id > 0
  )) return NextResponse.json({ error: "资料范围无效。" }, { status: 400 });
  try {
    const { status, ...result } = await reviewDocuments(input.docIds);
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ error: "暂时无法生成考试重点，请重试。" }, { status: 500 });
  }
}
