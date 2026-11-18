import { NextRequest, NextResponse } from "next/server";
import { submitExam } from "@/lib/grade";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!Number.isSafeInteger(body?.examId) || body.examId < 1) {
    return NextResponse.json({ error: "试卷 ID 无效。" }, { status: 400 });
  }
  try {
    const { status, ...result } = await submitExam(body.examId, body.answers);
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ error: "成绩保存失败，你的答案仍在，请重试。" }, { status: 500 });
  }
}
