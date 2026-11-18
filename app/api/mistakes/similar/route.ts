import { NextRequest, NextResponse } from "next/server";
import { checkPractice, createPractice } from "@/lib/mistakes";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const checking = body?.practiceId !== undefined;
  const id = checking ? body.practiceId : body?.mistakeId;
  if (!Number.isSafeInteger(id) || id < 1 || (checking && typeof body.answer !== "string")) {
    return NextResponse.json({ error: "变形题请求无效。" }, { status: 400 });
  }
  try {
    const { status, ...result } = checking ? await checkPractice(id, body.answer) : await createPractice(id);
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json({ error: "暂时无法处理变形题，请重试。" }, { status: 500 });
  }
}
