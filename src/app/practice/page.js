import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import SetupNotice from "@/components/SetupNotice";

export const dynamic = "force-dynamic";

export default async function PracticeRankingPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, rating:practice_rating, wins:practice_wins, losses:practice_losses")
    .order("practice_rating", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-red-600">
        연습경기 랭킹을 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  const ranked = players.reduce((acc, p, i) => {
    const rank =
      i === 0 || p.rating !== players[i - 1].rating ? i + 1 : acc[i - 1].rank;
    acc.push({ ...p, rank });
    return acc;
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">연습경기 랭킹</h1>

      {ranked.length === 0 ? (
        <p className="text-orange-800/70 dark:text-orange-200/70">
          아직 등록된 선수가 없습니다.{" "}
          <Link href="/practice/record" className="underline">
            첫 연습경기 결과를 입력
          </Link>
          해보세요.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-orange-200 text-left text-orange-800/70 dark:border-orange-800 dark:text-orange-200/70">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">이름</th>
              <th className="py-2 pr-2 font-medium text-right">레이팅</th>
              <th className="py-2 pr-2 font-medium text-right">전적</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p) => (
              <tr
                key={p.id}
                className="border-b border-orange-100 dark:border-orange-900/40"
              >
                <td className="py-2 pr-2 text-orange-800/70 dark:text-orange-200/70">
                  {p.rank}
                </td>
                <td className="py-2 pr-2 font-medium">
                  {p.rank === 1 ? "👑 " : ""}
                  {p.name}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {p.rating}
                </td>
                <td className="py-2 pr-2 text-right text-orange-800/70 tabular-nums dark:text-orange-200/70">
                  {p.wins}승 {p.losses}패
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
