import { NextRequest, NextResponse } from "next/server";
import { db, stmt } from "@/lib/db";
import { parseFile, chunkText } from "@/lib/parser";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const file = (await req.formData()).get("file") as File | null;
    if (!file) return NextResponse.json({ error: "缺少文件" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseFile(buffer, file.name);
    const type = file.name.split(".").pop()!.toLowerCase();

    const docId = Number(stmt.insertDoc.run(file.name, type, text).lastInsertRowid);
    const chunks = chunkText(text);
    db.transaction(() => {
      chunks.forEach((t, i) => stmt.insertChunk.run(docId, i, t, null));
    })();

    return NextResponse.json({ docId, chunks: chunks.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
