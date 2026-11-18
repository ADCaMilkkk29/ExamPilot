import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocument } from "@/lib/docs";

export const dynamic = "force-dynamic";

export default function DocumentPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!/^[1-9]\d*$/.test(params.id) || !Number.isSafeInteger(id)) notFound();
  const doc = getDocument(id);
  if (!doc) notFound();
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-8">
      <nav className="flex gap-4 text-sm font-semibold text-indigo-700 underline dark:text-indigo-300">
        <Link href="/library">资料库</Link>
        <Link href="/review">考试重点</Link>
      </nav>
      <h1 className="break-words text-2xl font-bold">{doc.filename}</h1>
      <section className="space-y-2">
        <h2 className="font-semibold">原文</h2>
        <p className="whitespace-pre-wrap break-words leading-7">{doc.content_text || "无原文内容"}</p>
      </section>
      {doc.chunks.map((chunk, index) => (
        <section key={chunk.id} id={index === 0 || doc.chunks[index - 1].seq !== chunk.seq ? `chunk-${chunk.seq}` : undefined}
          className="scroll-mt-5 rounded-xl border border-slate-200 p-4 target:border-indigo-600 dark:border-slate-800 dark:target:border-indigo-400">
          <h2 className="mb-2 font-semibold">分块 {chunk.seq + 1}</h2>
          <p className="whitespace-pre-wrap break-words leading-7">{chunk.text}</p>
        </section>
      ))}
    </main>
  );
}
