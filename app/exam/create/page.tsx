import Link from "next/link";
import { listDocuments } from "@/lib/docs";
import ExamCreateForm from "./exam-create-form";

export const dynamic = "force-dynamic";

export default function ExamCreatePage() {
  const { keywords } = listDocuments();
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-7 sm:px-8 sm:pt-10">
        <nav aria-label="页面导航" className="flex flex-wrap gap-4 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
          <Link className="hover:underline" href="/">ExamPilot 智学库</Link>
          <Link className="hover:underline" href="/library">资料库</Link>
        </nav>
        <h1 className="mb-7 mt-3 text-3xl font-bold tracking-tight sm:text-4xl">智能组卷</h1>
        <ExamCreateForm keywords={keywords} />
      </div>
    </main>
  );
}
