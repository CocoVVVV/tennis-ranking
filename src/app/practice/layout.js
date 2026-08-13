import Link from "next/link";

export default function PracticeLayout({ children }) {
  return (
    <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-6 dark:border-orange-700 dark:bg-orange-950/20">
      <div className="mb-4 rounded-lg bg-orange-100 px-4 py-2 text-sm font-medium text-orange-900 dark:bg-orange-900/40 dark:text-orange-100">
        🔶 연습경기 모드 — 여기서 기록한 결과는 정식 랭킹에 영향을 주지 않습니다.
      </div>
      <nav className="mb-6 flex items-center gap-4 border-b border-orange-200 pb-3 text-sm dark:border-orange-800">
        <span className="font-semibold text-orange-800 dark:text-orange-200">
          🔶 연습경기
        </span>
        <Link
          href="/practice"
          className="text-orange-700 hover:text-orange-900 dark:text-orange-300 dark:hover:text-orange-100"
        >
          랭킹
        </Link>
        <Link
          href="/practice/matches"
          className="text-orange-700 hover:text-orange-900 dark:text-orange-300 dark:hover:text-orange-100"
        >
          경기 기록
        </Link>
        <Link
          href="/practice/record"
          className="ml-auto rounded-full bg-orange-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-600"
        >
          결과 입력
        </Link>
      </nav>
      {children}
    </div>
  );
}
