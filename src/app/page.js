import Link from "next/link";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import SetupNotice from "@/components/SetupNotice";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, rating, wins, losses")
    .order("rating", { ascending: false });

  if (error) {
    return (
      <p className="text-sm text-red-600">
        랭킹을 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">랭킹</h1>

      {players.length === 0 ? (
        <p className="text-zinc-500">
          아직 등록된 선수가 없습니다.{" "}
          <Link href="/record" className="underline">
            첫 경기 결과를 입력
          </Link>
          해보세요.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-zinc-500 dark:border-zinc-800">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">이름</th>
              <th className="py-2 pr-2 font-medium text-right">레이팅</th>
              <th className="py-2 pr-2 font-medium text-right">전적</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr
                key={p.id}
                className="border-b border-zinc-100 dark:border-zinc-900"
              >
                <td className="py-2 pr-2 text-zinc-500">{i + 1}</td>
                <td className="py-2 pr-2 font-medium">
                  {i === 0 ? "👑 " : ""}
                  {p.name}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {p.rating}
                </td>
                <td className="py-2 pr-2 text-right text-zinc-500 tabular-nums">
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
