import "server-only";

import { db } from "@/lib/db";
import { embedTexts } from "@/lib/llm";

type Chunk = { doc_id: number; seq: number; text: string; filename: string };
type Candidate = Chunk & { id: number; embedding: string | null };
export type RetrievedChunk = Chunk & { score: number; method: "vector" | "text" };

const candidates = db.prepare<{ keywords: string }, Candidate>(`
  SELECT c.id, c.doc_id, c.seq, c.text, c.embedding, d.filename
  FROM chunks c JOIN documents d ON d.id = c.doc_id
  WHERE @keywords = '[]' OR EXISTS (
    SELECT 1 FROM doc_keywords dk JOIN keywords k ON k.id = dk.keyword_id
    WHERE dk.doc_id = d.id AND k.name IN (SELECT value FROM json_each(@keywords))
  )
`);

const words = new Intl.Segmenter("zh", { granularity: "word" });

function unitVector(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || !value.length) return;
  let largest = 0;
  for (const component of value) {
    if (!Number.isFinite(component)) return;
    largest = Math.max(largest, Math.abs(component));
  }
  if (largest === 0) return;
  const scaled = value.map((component) => component / largest);
  const norm = Math.sqrt(scaled.reduce((sum, component) => sum + component * component, 0));
  return scaled.map((component) => component / norm);
}

function storedVector(embedding: string | null) {
  if (!embedding) return;
  try {
    return unitVector(JSON.parse(embedding));
  } catch {
    return undefined;
  }
}

export async function retrieve(keywords: string[], query: string, topK = 8): Promise<RetrievedChunk[]> {
  if (!Number.isSafeInteger(topK) || topK <= 0) return [];
  const tags = Array.from(new Set(keywords.map((keyword) => keyword.trim()).filter(Boolean)));
  const rows = candidates.all({ keywords: JSON.stringify(tags) });
  if (!rows.length) return [];

  const search = query.trim();
  const lower = search.toLowerCase();
  const terms = Array.from(new Set([
    ...tags.map((tag) => tag.toLowerCase()),
    ...Array.from(words.segment(lower))
      .filter(({ isWordLike, segment }) => isWordLike && segment.length > 1)
      .map(({ segment }) => segment),
  ]));
  const vectors = search ? rows.map(({ embedding }) => storedVector(embedding)) : [];
  const queryVector = vectors.some(Boolean)
    ? await embedTexts([search]).then(([value]) => unitVector(value), () => undefined)
    : undefined;

  const results: (RetrievedChunk & { id: number })[] = rows.map(({ embedding, ...row }, index) => {
    const vector = vectors[index];
    if (queryVector && vector && queryVector.length === vector.length) {
      const score = vector.reduce((sum, value, i) => sum + value * queryVector[i], 0);
      return { ...row, score: Math.max(0, Math.min(1, score)), method: "vector" };
    }
    const text = row.text.toLowerCase();
    const matched = terms.filter((term) => text.includes(term)).length;
    const score = lower && text.includes(lower) ? 1 : matched / Math.max(1, terms.length);
    return { ...row, score, method: "text" };
  });

  // Both scores range from 0 to 1. Favor cosine on ties, then use source order.
  return results
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || Number(b.method === "vector") - Number(a.method === "vector") ||
      a.doc_id - b.doc_id || a.seq - b.seq || a.id - b.id)
    .slice(0, topK)
    .map(({ id, ...result }) => result);
}
