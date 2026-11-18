"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export default function ExamCreateForm({ keywords }: { keywords: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const requirement = String(data.get("requirement") ?? "").trim();
    if (!requirement) {
      setError("请填写组卷要求。");
      return;
    }
    const duration = String(data.get("durationMinutes") ?? "");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/exam/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: data.getAll("keywords").map(String),
          requirement,
          durationMinutes: duration ? Number(duration) : undefined,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !Number.isSafeInteger(result?.examId) || result.examId <= 0) {
        throw new Error(typeof result?.error === "string" ? result.error : "组卷失败，请重试。");
      }
      router.push(`/exam/${result.examId}`);
    } catch (cause) {
      setError(cause instanceof Error && cause.message !== "Failed to fetch" ? cause.message : "组卷失败，请重试。");
      setBusy(false);
    }
  }

  return (
    <form
      aria-busy={busy}
      className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-7"
      onSubmit={generate}
    >
      <fieldset disabled={busy}>
        <legend className="mb-2 font-semibold">关键词</legend>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <label className="inline-flex max-w-full cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:border-slate-700 dark:has-[:checked]:bg-indigo-950"
                key={keyword}>
                <input className="mt-0.5 shrink-0 accent-indigo-600" name="keywords" type="checkbox" value={keyword} />
                <span className="[overflow-wrap:anywhere]">{keyword}</span>
              </label>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {keywords.length ? "可多选，留空时检索全部资料。" : "暂无关键词，将检索全部资料。"}
        </p>
      </fieldset>
      <div>
        <label className="mb-2 block font-semibold" htmlFor="exam-requirement">组卷要求</label>
        <textarea
          className={`${input} block min-h-28 w-full`}
          disabled={busy}
          id="exam-requirement"
          name="requirement"
          placeholder="例如，帮我出一份高数期中卷，包含极限和导数。"
          required
          rows={4}
        />
      </div>
      <div>
        <label className="mb-2 block font-semibold" htmlFor="exam-duration">考试时长（分钟）</label>
        <input
          className={`${input} w-32`}
          defaultValue={60}
          disabled={busy}
          id="exam-duration"
          max={180}
          min={1}
          name="durationMinutes"
          step={1}
          type="number"
        />
      </div>
      {error && <p className="text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
      <button
        className="rounded-lg bg-indigo-700 px-5 py-2.5 font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-500"
        disabled={busy}
        type="submit"
      >
        {busy ? "正在组卷…" : "生成试卷"}
      </button>
    </form>
  );
}
