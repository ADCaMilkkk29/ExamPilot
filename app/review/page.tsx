import Link from "next/link";
import { listDocuments } from "@/lib/docs";
import ReviewClient from "./review-client";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  const { docs } = listDocuments();
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <nav className="flex gap-4 text-sm font-semibold text-indigo-700 underline dark:text-indigo-300">
          <Link href="/">ExamPilot 智学库</Link>
          <Link href="/library">资料库</Link>
        </nav>
        <h1 className="mb-6 mt-3 text-3xl font-bold">考试重点</h1>
        <ReviewClient documents={docs.map(({ id, filename }) => ({ id, filename }))} />
      </div>
    </main>
  );
}
