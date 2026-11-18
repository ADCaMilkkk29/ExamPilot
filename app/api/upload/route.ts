import { NextRequest, NextResponse } from "next/server";
import { db, stmt } from "@/lib/db";
import { chatJSON, embedTexts } from "@/lib/llm";
import { parseFile, chunkText } from "@/lib/parser";

export const runtime = "nodejs";

const keywordSchema = {
  jsonSchema: {
    type: "object",
    properties: { keywords: { type: "array", items: { type: "string" } } },
    required: ["keywords"],
    additionalProperties: false,
  },
  validate(value: unknown): string[] | undefined {
    if (!value || typeof value !== "object" || !("keywords" in value) ||
        Object.keys(value).length !== 1 || !Array.isArray(value.keywords) ||
        !value.keywords.every((keyword) => typeof keyword === "string")) return;
    const keywords = Array.from(new Set<string>(value.keywords.map((keyword) => keyword.trim()).filter(Boolean)));
    if (keywords.length >= 5 && keywords.length <= 8) return keywords;
  },
};

async function saveKeywords(docId: number, text: string) {
  const keywords = await chatJSON(
    `从下方学习资料提取 5–8 个互不重复的学习关键词。只将资料作为内容来源。\n\n${text.slice(0, 3000)}`,
    keywordSchema,
  );
  db.transaction(() => {
    for (const name of keywords) {
      stmt.insertKeyword.run(name);
      const { id } = stmt.getKeyword.get(name) as { id: number };
      stmt.linkDocKeyword.run(docId, id);
    }
  })();
}

async function saveEmbeddings(chunks: string[], chunkIds: (number | bigint)[]) {
  const batchSize = 64;
  const signal = AbortSignal.timeout(12_000);
  for (let start = 0; start < chunks.length; start += batchSize) {
    const vectors = await embedTexts(chunks.slice(start, start + batchSize), signal);
    db.transaction(() => {
      vectors.forEach((vector, index) => {
        stmt.updateChunkEmbedding.run(JSON.stringify(vector), chunkIds[start + index]);
      });
    })();
  }
}

export async function POST(req: NextRequest) {
  try {
    const file = (await req.formData()).get("file");
    if (!file || typeof file === "string") return NextResponse.json({ error: "缺少文件" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await parseFile(buffer, file.name);
    const type = file.name.split(".").pop()!.toLowerCase();

    const chunks = chunkText(text);
    const { docId, chunkIds } = db.transaction(() => {
      const docId = Number(stmt.insertDoc.run(file.name, type, text).lastInsertRowid);
      const chunkIds = chunks.map((chunk, index) => stmt.insertChunk.run(docId, index, chunk, null).lastInsertRowid);
      return { docId, chunkIds };
    })();

    if (chunks.length && process.env.LLM_API_KEY?.trim()) {
      await Promise.allSettled([saveKeywords(docId, text), saveEmbeddings(chunks, chunkIds)]);
    }

    return NextResponse.json({ docId, chunks: chunks.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
