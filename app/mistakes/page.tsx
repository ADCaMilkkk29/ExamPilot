import Link from "next/link";
import { listMistakes } from "@/lib/mistakes";
import { renderMath } from "../exam/math";
import PracticeForm from "./practice-form";

export const dynamic = "force-dynamic";

export default function MistakesPage() {
  const mistakes = listMistakes();
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-8">
        <Link href="/" className="text-sm font-semibold text-indigo-700 underline dark:text-indigo-300">ExamPilot 智学库</Link>
        <h1 className="text-3xl font-bold">错题本</h1>
        {!mistakes.length && <p>暂无错题。</p>}
        {mistakes.map(({ id, question, examId, examTitle, resultId }) => (
          <details key={id} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <summary className="cursor-pointer break-words font-semibold">{renderMath(question.stem)}</summary>
            <dl className="my-4 space-y-2 text-sm [overflow-wrap:anywhere]">
              {[["你的答案", question.response || "未作答"], ["标准答案", question.answer], ["解析", question.analysis]].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-semibold">{label}</dt>
                  <dd className="overflow-x-auto whitespace-pre-wrap">{renderMath(value)}</dd>
                </div>
              ))}
              <div>
                <dt className="font-semibold">来源考试</dt>
                <dd><Link className="text-indigo-700 underline dark:text-indigo-300"
                  href={`/exam/${examId}/result?resultId=${resultId}`}>{examTitle}</Link></dd>
              </div>
            </dl>
            <PracticeForm mistakeId={id} />
          </details>
        ))}
      </div>
    </main>
  );
}
