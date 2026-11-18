"use client";

import { useState, type FormEvent } from "react";
import type { Practice, PracticeFeedback } from "@/lib/mistakes";
import { renderMath } from "../exam/math";

const button = "rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800 disabled:opacity-60";
const field = "w-full rounded-lg border border-slate-300 bg-white p-2 dark:border-slate-700 dark:bg-slate-950";

async function request(body: { mistakeId: number } | { practiceId: number; answer: string }) {
  const response = await fetch("/api/mistakes/similar", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error ?? "请求失败，请重试。");
  return result as { practice?: Practice; feedback?: PracticeFeedback };
}

export default function PracticeForm({ mistakeId }: { mistakeId: number }) {
  const [practice, setPractice] = useState<Practice>();
  const [feedback, setFeedback] = useState<PracticeFeedback>();
  const [pending, setPending] = useState<"generate" | "check">();
  const [error, setError] = useState("");
  const inputId = `practice-answer-${mistakeId}`;

  async function generate() {
    setPending("generate");
    setError("");
    try {
      setPractice((await request({ mistakeId })).practice);
      setFeedback(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "生成失败，请重试。");
    } finally {
      setPending(undefined);
    }
  }

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!practice) return;
    const answer = String(new FormData(event.currentTarget).get("answer") ?? "");
    setError("");
    setFeedback(undefined);
    setPending("check");
    try {
      setFeedback((await request({ practiceId: practice.id, answer })).feedback);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "判分失败，请重试。");
    } finally {
      setPending(undefined);
    }
  }

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-800">
      <button className={button} type="button" onClick={generate} disabled={!!pending}>
        {pending === "generate" ? "正在生成…" : practice ? "再生成一题" : "生成变形题"}
      </button>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      {practice && (
        <form key={practice.id} onSubmit={check} aria-busy={!!pending}>
          <fieldset className="space-y-3" disabled={!!pending}>
            <legend className="font-semibold">变形题 · {practice.score} 分</legend>
            <p className="overflow-x-auto whitespace-pre-wrap">{renderMath(practice.stem)}</p>
            {practice.type === "choice" ? practice.options?.map((option) => (
              <label key={option} className="flex items-center gap-2 break-words">
                <input type="radio" name="answer" value={option} required /> {renderMath(option)}
              </label>
            )) : (
              <>
                <label className="block text-sm font-semibold" htmlFor={inputId}>作答</label>
                {practice.type === "blank" ? <input id={inputId} name="answer" className={field} required /> :
                  <textarea id={inputId} name="answer" className={field} rows={4} required />}
              </>
            )}
            <button type="submit" className={button}>{pending === "check" ? "正在判分…" : "提交练习"}</button>
          </fieldset>
        </form>
      )}
      {practice && feedback && (
        <div aria-live="polite" className="space-y-2 rounded-lg bg-slate-100 p-3 text-sm dark:bg-slate-800">
          <p className="font-semibold">{feedback.awarded} / {practice.score} 分 · {feedback.comment}</p>
          <p>标准答案：{renderMath(feedback.answer)}</p>
          <p>解析：{renderMath(feedback.analysis)}</p>
        </div>
      )}
    </div>
  );
}
