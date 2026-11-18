import "server-only";

import { db } from "@/lib/db";

export type DocSummary = {
  id: number;
  filename: string;
  type: string;
  created_at: string;
  keywords: string[];
};

export type DocDetail = DocSummary & {
  content_text: string;
  chunks: { id: number; seq: number; text: string }[];
};

type DocRow = Omit<DocSummary, "keywords"> & { keyword_json: string };

const attachedKeywords = `(
  SELECT json_group_array(k.name ORDER BY k.name)
  FROM doc_keywords dk JOIN keywords k ON k.id = dk.keyword_id
  WHERE dk.doc_id = d.id
) AS keyword_json`;

db.function("doc_contains", { deterministic: true }, (text: string, query: string) =>
  Number(text.toLowerCase().includes(query)),
);

const listDocs = db.prepare<{ keyword: string; q: string }, DocRow>(`
  SELECT d.id, d.filename, d.type, d.created_at, ${attachedKeywords}
  FROM documents d
  WHERE (@keyword = '' OR EXISTS (
    SELECT 1 FROM doc_keywords dk JOIN keywords k ON k.id = dk.keyword_id
    WHERE dk.doc_id = d.id AND k.name = @keyword
  ))
  AND (@q = '' OR doc_contains(d.filename, @q) OR doc_contains(d.content_text, @q))
  ORDER BY d.id DESC
`);
const listKeywords = db.prepare<[], string>(`
  SELECT DISTINCT k.name
  FROM keywords k JOIN doc_keywords dk ON dk.keyword_id = k.id
  ORDER BY k.name
`).pluck();
const findDoc = db.prepare<[number], DocRow & { content_text: string }>(`
  SELECT d.id, d.filename, d.type, d.created_at, d.content_text, ${attachedKeywords}
  FROM documents d
  WHERE d.id = ?
`);
const findChunks = db.prepare<[number], DocDetail["chunks"][number]>(`
  SELECT id, seq, text FROM chunks WHERE doc_id = ? ORDER BY seq, id
`);

function withKeywords<T extends DocRow>({ keyword_json, ...doc }: T) {
  return { ...doc, keywords: JSON.parse(keyword_json) as string[] };
}

export const listDocuments = db.transaction((keyword = "", q = "") => ({
  docs: listDocs.all({ keyword: keyword.trim(), q: q.trim().toLowerCase() }).map(withKeywords),
  keywords: listKeywords.all(),
}));

export const getDocument = db.transaction((id: number): DocDetail | undefined => {
  const doc = findDoc.get(id);
  if (doc) return { ...withKeywords(doc), chunks: findChunks.all(id) };
});
