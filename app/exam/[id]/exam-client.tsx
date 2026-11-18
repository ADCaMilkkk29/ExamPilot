"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ExamView } from "@/lib/exam";

type Question = Pick<ExamView["questions"][number], "type" | "score"> & {
  stem: ReactNode;
  options?: { value: string; label: ReactNode }[];
};

const typeLabel = { choice: "选择题", blank: "填空题", essay: "解答题" };
const panel = "rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";
const answerInput = "mt-4 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950";

function displayTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export default function ExamClient({ examId, durationMinutes, questions }: {
  examId: number; durationMinutes: number; questions: Question[];
}) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(durationMinutes * 60);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const deadline = Date.now() + durationMinutes * 60_000;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [durationMinutes]);

  const answeredCount = Object.values(answers).filter((answer) => answer.trim()).length;
  const expired = seconds === 0;

  function recordAnswer(index: number, value: string) {
    setAnswers((previous) => ({ ...previous, [index]: value }));
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/grade", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId, answers: questions.map((_, index) => answers[index] ?? "") }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !Number.isSafeInteger(result?.resultId)) {
        setError(result?.error ?? "交卷失败，你的答案仍在，请重试。");
        setSubmitting(false);
        return;
      }
      router.push(`/exam/${examId}/result?resultId=${result.resultId}`);
    } catch {
      setError("交卷失败，你的答案仍在，请重试。");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className={`${panel} p-4 lg:sticky lg:top-5`}>
        <p className="text-sm text-slate-600 dark:text-slate-300">剩余时间</p>
        <p aria-label="剩余时间" className="mt-1 text-3xl font-bold tabular-nums" role="timer">
          {displayTime(seconds)}
        </p>
        {expired && <p className="mt-2 text-sm text-amber-800 dark:text-amber-300" role="status">作答时间已结束。</p>}
        <nav aria-label="答题卡" className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">答题卡</h2>
            <p className="text-sm tabular-nums text-slate-600 dark:text-slate-300">已答 {answeredCount}/{questions.length}</p>
          </div>
          <ol className="mt-3 flex flex-wrap gap-2">
            {questions.map((_, index) => {
              const answered = Boolean(answers[index]?.trim());
              return (
                <li key={index}>
                  <a
                    aria-label={`第 ${index + 1} 题`}
                    className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-1 font-medium tabular-nums hover:border-indigo-500 ${answered
                      ? "border-indigo-500 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200"
                      : "border-slate-200 dark:border-slate-700"}`}
                    data-answered={answered}
                    href={`#question-${index + 1}`}
                  >
                    {index + 1}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>
      <div className="min-w-0 space-y-5">
        {questions.map((question, index) => {
          const number = index + 1;
          const questionId = `question-${number}`;
          const inputId = `answer-${number}`;
          const answer = answers[index] ?? "";
          return (
            <fieldset
              className={`${panel} min-w-0 scroll-mt-5 px-4 pb-5 pt-2 sm:px-6`}
              disabled={expired || submitting}
              id={questionId}
              key={questionId}
              tabIndex={-1}
            >
              <legend className="px-2 font-bold">第 {number} 题</legend>
              <div className="mb-2 text-sm text-slate-600 dark:text-slate-300">
                {typeLabel[question.type]} <span aria-hidden="true">·</span> {question.score} 分
              </div>
              <div className="overflow-x-auto whitespace-pre-wrap leading-7 [overflow-wrap:anywhere]">{question.stem}</div>
              {question.type === "choice" ? (
                <div className="mt-4 space-y-2">
                  {question.options?.map(({ label, value }, optionIndex) => (
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:border-slate-700 dark:has-[:checked]:bg-indigo-950"
                      key={optionIndex}>
                      <input
                        checked={answer === value}
                        className="mt-1 shrink-0 accent-indigo-600"
                        name={inputId}
                        onChange={() => recordAnswer(index, value)}
                        type="radio"
                        value={value}
                      />
                      <span className="min-w-0 overflow-x-auto whitespace-pre-wrap [overflow-wrap:anywhere]">{label}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <>
                  <label className="sr-only" htmlFor={inputId}>第 {number} 题答案</label>
                  {question.type === "blank" ? (
                    <input
                      className={answerInput}
                      id={inputId}
                      onChange={(event) => recordAnswer(index, event.target.value)}
                      placeholder="填写答案"
                      type="text"
                      value={answer}
                    />
                  ) : (
                    <textarea
                      className={answerInput}
                      id={inputId}
                      onChange={(event) => recordAnswer(index, event.target.value)}
                      placeholder="写出解答过程"
                      rows={5}
                      value={answer}
                    />
                  )}
                </>
              )}
            </fieldset>
          );
        })}
        <div className="flex flex-wrap items-center gap-3">
          <button className="rounded-lg bg-indigo-700 px-4 py-2 font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
            disabled={submitting} onClick={submit} type="button">
            {submitting ? "正在判分…" : "提交试卷"}
          </button>
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  );
}
