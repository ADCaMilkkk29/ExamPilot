import Link from "next/link";
import { listDocuments } from "@/lib/docs";
import LibraryClient from "./library-client";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string | string[]; keyword?: string | string[] };

function firstValue(value: string | string[] | undefined) {
  return (typeof value === "string" ? value : value?.[0] ?? "").trim();
}

export default function LibraryPage({ searchParams }: { searchParams: SearchParams }) {
  const q = firstValue(searchParams.q);
  const keyword = firstValue(searchParams.keyword);
  const { docs, keywords } = listDocuments(keyword, q);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-8 sm:pt-10">
        <Link
          className="text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
          href="/"
        >
          ExamPilot 智学库
        </Link>
        <h1 className="mb-7 mt-3 text-3xl font-bold tracking-tight sm:text-4xl">资料库</h1>
        <LibraryClient docs={docs} keywords={keywords} q={q} keyword={keyword} />
      </div>
    </main>
  );
}
