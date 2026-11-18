import Link from "next/link";
import { notFound } from "next/navigation";
import { renderMath } from "../math";
import { getExamView } from "@/lib/exam";
import ExamClient from "./exam-client";

export const dynamic = "force-dynamic";

export default function ExamPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!/^[1-9]\d*$/.test(params.id) || !Number.isSafeInteger(id)) notFound();
  const exam = getExamView(id);
  if (!exam) notFound();
  const questions = exam.questions.map(({ type, stem, options, score }) => ({
    type,
    stem: renderMath(stem),
    options: options?.map((option) => ({ value: option, label: renderMath(option) })),
    score,
  }));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-8 sm:pt-10">
        <Link className="text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300" href="/exam/create">
          返回组卷
        </Link>
        <header className="mb-7 mt-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight [overflow-wrap:anywhere] sm:text-4xl">{exam.title}</h1>
            {exam.isExample && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                示例试卷
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {questions.length} 道题 <span aria-hidden="true">·</span> {exam.durationMinutes} 分钟
          </p>
        </header>
        <ExamClient key={exam.id} durationMinutes={exam.durationMinutes} questions={questions} />
      </div>
    </main>
  );
}
