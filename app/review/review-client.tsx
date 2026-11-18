"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { ReviewPoint } from "@/lib/review";

const panel = "rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";

export default function ReviewClient({ documents }: { documents: { id: number; filename: string }[] }) {
  const [points, setPoints] = useState<ReviewPoint[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const docIds = new FormData(event.currentTarget).getAll("documents").map(Number);
    setError("");
    setPoints([]);
    setPending(true);
    try {
      const response = await fetch("/api/review", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ docIds }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(result?.points)) {
        setError(result?.error ?? "生成失败，请重试。");
        return;
      }
      setPoints(result.points);
    } catch {
      setError("生成失败，请重试。");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <form className={panel} onSubmit={generate} aria-busy={pending}>
        <fieldset disabled={pending} className="space-y-3">
          <legend className="font-semibold">资料范围</legend>
          <p className="text-sm text-slate-600 dark:text-slate-300">{documents.length ? "可多选，留空时使用全部资料。" : "暂无资料，请先上传。"}</p>
          <div className="max-h-60 space-y-1 overflow-auto">
            {documents.map(({ id, filename }) => (
              <label key={id} className="flex items-start gap-2 py-1">
                <input type="checkbox" name="documents" value={id} className="mt-1 shrink-0 accent-indigo-700" />
                <span className="break-all">{filename}</span>
              </label>
            ))}
          </div>
          <button type="submit"
            className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800 disabled:opacity-60" disabled={!documents.length}>
            {pending ? "正在生成…" : "生成考试重点"}
          </button>
        </fieldset>
      </form>
      {pending && <p role="status" className="text-sm">正在整理所选资料…</p>}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {points.map((point, index) => (
        <article key={index} className={`${panel} space-y-3 [overflow-wrap:anywhere]`}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold">{point.name}</h2>
            <span aria-label={`${point.stars} 星`} className="text-amber-700 dark:text-amber-300">
              {"★".repeat(point.stars)}{"☆".repeat(5 - point.stars)}
            </span>
            {point.frequency >= 3 && <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">高频🔥</span>}
          </div>
          <p className="whitespace-pre-wrap">{point.summary}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {point.doc_id !== null && point.chunk_seq !== null && <Link href={`/library/${point.doc_id}#chunk-${point.chunk_seq}`}
              className="text-indigo-700 underline dark:text-indigo-300">{point.filename} · 分块 {point.chunk_seq + 1}</Link>}
            <span className="text-slate-600 dark:text-slate-300">往年试卷中出现 {point.frequency} 次</span>
          </div>
        </article>
      ))}
    </div>
  );
}
