import Link from "next/link";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">ExamPilot 智学库</h1>
      <nav aria-label="主要功能" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-medium text-indigo-700 dark:text-indigo-300">
        <Link className="underline" href="/library">进入资料库</Link>
        <Link className="underline" href="/exam/create">智能组卷</Link>
        <Link className="underline" href="/review">考试重点</Link>
      </nav>
    </main>
  );
}
