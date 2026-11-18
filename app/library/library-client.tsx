"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { FormEvent } from "react";
import type { DocDetail, DocSummary } from "@/lib/docs";

type LibraryProps = { docs: DocSummary[]; keywords: string[]; q: string; keyword: string };
type Feedback = { kind: "success" | "error"; text: string };

const panel = "rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";
const field = "min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950";
const button = "shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} bg-indigo-700 text-white hover:bg-indigo-800 dark:bg-indigo-500 dark:hover:bg-indigo-600`;
const secondary = `${button} border border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800`;
const danger = `${button} text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950`;

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    throw new Error(typeof result?.error === "string" ? result.error : fallback);
  }
  return result as T;
}

function DetailDialog({ doc, onClose }: { doc: DocDetail; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, []);

  return (
    <dialog
      aria-label="资料详情"
      className={`${panel} max-h-[85dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto text-slate-900 shadow-2xl backdrop:bg-slate-950/60 dark:text-slate-100`}
      onClose={onClose}
      ref={dialog}
    >
      <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <h2 className="min-w-0 break-all pt-1 text-lg font-bold">{doc.filename}</h2>
        <button className={secondary} onClick={() => dialog.current?.close()} type="button">关闭详情</button>
      </div>
      <div className="space-y-5 p-4 sm:p-6">
        <section>
          <h3 className="mb-2 font-semibold">原文</h3>
          <p className="whitespace-pre-wrap break-words text-sm leading-7">{doc.content_text || "无原文内容"}</p>
        </section>
        {doc.chunks.length > 0 && (
          <details className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <summary className="cursor-pointer font-semibold">分块（{doc.chunks.length}）</summary>
            <div className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">
              {doc.chunks.map((chunk) => (
                <details className="py-2" key={chunk.id}>
                  <summary className="cursor-pointer text-sm font-medium">分块 {chunk.seq + 1}</summary>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">{chunk.text}</p>
                </details>
              ))}
            </div>
          </details>
        )}
      </div>
    </dialog>
  );
}

export default function LibraryClient({ docs, keywords, q, keyword }: LibraryProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activity, setActivity] = useState<"upload" | "view" | "delete" | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [detail, setDetail] = useState<DocDetail | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const filterForm = useRef<HTMLFormElement>(null);
  const busy = pending || activity !== null;
  const filtered = Boolean(q || keyword);

  function navigate(nextQ: string, nextKeyword: string) {
    setConfirmId(null);
    setFeedback(null);
    const query = new URLSearchParams();
    if (nextQ) query.set("q", nextQ);
    if (nextKeyword) query.set("keyword", nextKeyword);
    startTransition(() => router.push(query.size ? `/library?${query}` : "/library"));
  }

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    navigate(String(data.get("q") ?? "").trim(), String(data.get("keyword") ?? ""));
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setActivity("upload");
    setFeedback(null);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: data });
      const result = await readResponse<{ chunks: number }>(response, "上传失败，请重试。");
      form.reset();
      setFeedback({ kind: "success", text: `资料已上传，共生成 ${result.chunks} 个分块。` });
      startTransition(() => router.refresh());
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "上传失败，请重试。" });
    } finally {
      setActivity(null);
    }
  }

  async function view(doc: DocSummary) {
    setActivity("view");
    setFeedback(null);
    try {
      const response = await fetch(`/api/docs/${doc.id}`, { cache: "no-store" });
      const result = await readResponse<{ doc: DocDetail }>(response, "无法打开资料，请重试。");
      setDetail(result.doc);
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "无法打开资料，请重试。" });
    } finally {
      setActivity(null);
    }
  }

  async function remove(doc: DocSummary) {
    setActivity("delete");
    setFeedback(null);
    try {
      const response = await fetch(`/api/docs/${doc.id}`, { method: "DELETE" });
      await readResponse<{ deleted: true }>(response, "删除失败，请重试。");
      setConfirmId(null);
      setDetail(null);
      setFeedback({ kind: "success", text: "资料已删除。" });
      startTransition(() => router.refresh());
    } catch (error) {
      setFeedback({ kind: "error", text: error instanceof Error ? error.message : "删除失败，请重试。" });
    } finally {
      setActivity(null);
    }
  }

  return (
    <div className="space-y-6">
      <form className={`${panel} flex flex-wrap items-end gap-3 p-4 sm:p-5`} onSubmit={upload}>
        <div className="min-w-0 grow">
          <label className="mb-1.5 block text-sm font-semibold" htmlFor="library-file">选择资料文件</label>
          <input
            accept=".pdf,.docx,.txt,.md"
            className={`${field} file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:font-medium file:text-indigo-800 dark:file:bg-indigo-950 dark:file:text-indigo-200`}
            disabled={busy}
            id="library-file"
            name="file"
            required
            type="file"
          />
        </div>
        <button className={primary} disabled={busy} type="submit">
          {activity === "upload" ? "上传中…" : "上传资料"}
        </button>
      </form>

      <div aria-live="polite" className="empty:hidden">
        {feedback && (
          <p className={feedback.kind === "error" ? "text-sm text-red-700 dark:text-red-300" : "text-sm text-emerald-700 dark:text-emerald-300"}
            role={feedback.kind === "error" ? "alert" : "status"}>
            {feedback.text}
          </p>
        )}
        {activity === "view" && <p className="text-sm">正在打开资料…</p>}
        {pending && !feedback && <p className="text-sm">正在加载资料列表…</p>}
      </div>

      <section aria-labelledby="library-results">
        <form
          className="flex flex-wrap items-end gap-3"
          key={JSON.stringify([q, keyword])}
          onSubmit={filter}
          ref={filterForm}
        >
          <div className="min-w-0 grow basis-52">
            <label className="mb-1.5 block text-sm font-semibold" htmlFor="library-search">搜索资料</label>
            <input
              className={field} defaultValue={q} disabled={busy} id="library-search" name="q"
              placeholder="按文件名或资料内容搜索" type="search"
            />
          </div>
          <div className="min-w-0 grow basis-36 sm:grow-0">
            <label className="mb-1.5 block text-sm font-semibold" htmlFor="library-keyword">关键词</label>
            <select className={field} defaultValue={keyword} disabled={busy} id="library-keyword" name="keyword">
              <option value="">全部关键词</option>
              {keyword && !keywords.includes(keyword) && <option value={keyword}>{keyword}</option>}
              {keywords.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button className={primary} disabled={busy} type="submit">筛选</button>
            <button
              className={secondary}
              disabled={busy}
              onClick={() => { filterForm.current?.reset(); navigate("", ""); }}
              type="button"
            >
              清除筛选
            </button>
          </div>
        </form>

        <div className="mb-3 mt-6 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold" id="library-results">{filtered ? "筛选结果" : "全部资料"}</h2>
          <span className="text-sm text-slate-600 dark:text-slate-300">{docs.length} 份资料</span>
        </div>
        {docs.length === 0 ? (
          <div className={`${panel} px-5 py-10 text-center text-sm text-slate-600 dark:text-slate-300`}>
            {filtered ? "没有符合条件的资料" : "资料库暂无资料"}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((doc) => (
              <article aria-labelledby={`library-doc-${doc.id}`} className={`${panel} flex flex-col p-4`} key={doc.id}>
                <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {doc.type.toUpperCase()} <span aria-hidden="true">·</span>{" "}
                  <time dateTime={doc.created_at.slice(0, 10)}>{doc.created_at.slice(0, 10)}</time>
                </p>
                <h3 className="break-all text-base font-bold" id={`library-doc-${doc.id}`}>{doc.filename}</h3>
                <div className="mb-4 mt-3 grow">
                  {doc.keywords.length ? (
                    <ul aria-label="资料关键词" className="flex flex-wrap gap-1.5">
                      {doc.keywords.map((tag) => (
                        <li className="max-w-full break-words rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200" key={tag}>{tag}</li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-slate-600 dark:text-slate-300">暂无关键词</p>}
                </div>
                {confirmId === doc.id ? (
                  <div className="space-y-2 rounded-lg bg-red-50 p-3 dark:bg-red-950/50">
                    <p className="text-sm">删除这份资料及其分块？</p>
                    <div className="flex flex-wrap gap-2">
                      <button className={danger} disabled={busy} onClick={() => remove(doc)} type="button">
                        {activity === "delete" ? "删除中…" : "确认删除"}
                      </button>
                      <button className={secondary} disabled={busy} onClick={() => setConfirmId(null)} type="button">取消删除</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-between gap-2">
                    <button className={secondary} disabled={busy} onClick={() => view(doc)} type="button">查看原文</button>
                    <button className={danger} disabled={busy} onClick={() => setConfirmId(doc.id)} type="button">删除资料</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
      {detail && <DetailDialog doc={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
