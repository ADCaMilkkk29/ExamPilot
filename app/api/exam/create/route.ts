import { NextRequest, NextResponse } from "next/server";
import { createExam, parseExamRequest } from "@/lib/exam";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const input = parseExamRequest(await request.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "请提供关键词列表和组卷要求，考试时长须为 1–180 分钟的整数。" }, { status: 400 });
  }
  try {
    return NextResponse.json(await createExam(input));
  } catch {
    return NextResponse.json({ error: "无法保存试卷，请重试。" }, { status: 500 });
  }
}
