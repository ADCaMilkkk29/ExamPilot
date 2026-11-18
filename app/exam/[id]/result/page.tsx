import Link from "next/link";
import { notFound } from "next/navigation";
import { getReport } from "@/lib/grade";
import { renderMath } from "../../math";

export const dynamic = "force-dynamic";

export default function ResultPage({ params, searchParams }: {
  params: { id: string }; searchParams: { resultId?: string | string[] };
}) {
  const examId = Number(params.id);
  const resultId = Number(searchParams.resultId);
  if (!/^[1-9]\d*$/.test(params.id) || !Number.isSafeInteger(examId) ||
      typeof searchParams.resultId !== "string" || !/^[1-9]\d*$/.test(searchParams.resultId) ||
      !Number.isSafeInteger(resultId)) notFound();
  const report = getReport(examId, resultId);
  if (!report) notFound();
  const displayScore = (value: number) => Number(value.toFixed(2));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-8">
        <nav className="flex gap-4 text-sm font-semibold text-indigo-700 underline dark:text-indigo-300">
          <Link href={`/exam/${examId}`}>返回试卷</Link>
        </nav>
        <header className="rounded-2xl border border-indigo-100 bg-indigo-50 p-6 dark:border-indigo-900 dark:bg-indigo-950">
          <h1 className="text-2xl font-bold">成绩报告</h1>
          <p className="mt-1 break-words">{report.title}</p>
          <p className="mt-4 text-3xl font-bold tabular-nums">{displayScore(report.total)} / {displayScore(report.maximum)} 分</p>
        </header>
        {report.questions.map((question, i) => (
          <article key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex flex-wrap justify-between gap-2 font-semibold">
              <span>第 {i + 1} 题</span>
              <span>{question.awarded === question.score ? "正确" : question.awarded > 0 ? "部分得分" : "未得分"} · {displayScore(question.awarded)} / {displayScore(question.score)} 分</span>
            </h2>
            <p className="overflow-x-auto whitespace-pre-wrap">{renderMath(question.stem)}</p>
            <dl className="space-y-2 text-sm [overflow-wrap:anywhere]">
              {[
                ["你的答案", question.response || "未作答"],
                ["参考答案", question.answer],
                ["解析", question.analysis],
                ["评语", question.comment],
              ].map(([label, text]) => (
                <div key={label}>
                  <dt className="font-semibold">{label}</dt>
                  <dd className="mt-1 overflow-x-auto whitespace-pre-wrap">{renderMath(text)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </main>
  );
}
