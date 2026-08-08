"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function ratingDelta(before, after) {
  const diff = after - before;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${diff}`;
}

export default function MatchesList({ matches }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function handleDelete(matchId) {
    if (!confirm("이 경기 기록을 삭제할까요? 삭제하면 이후 모든 레이팅이 다시 계산됩니다.")) {
      return;
    }
    setDeletingId(matchId);
    setError("");
    const { error: rpcError } = await supabase.rpc("delete_match", {
      p_match_id: matchId,
    });
    setDeletingId(null);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <ul className="flex flex-col gap-3">
        {matches.map((m) => {
          const team1Won = m.winning_team === 1;
          return (
            <li
              key={m.id}
              className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-4">
                <span>
                  <span className={team1Won ? "font-semibold" : ""}>
                    {m.team1_player1.name} · {m.team1_player2.name}
                  </span>
                  {" vs "}
                  <span className={!team1Won ? "font-semibold" : ""}>
                    {m.team2_player1.name} · {m.team2_player2.name}
                  </span>
                  {m.score ? (
                    <span className="ml-2 text-zinc-500">{m.score}</span>
                  ) : null}
                </span>
                <span className="whitespace-nowrap text-zinc-500">
                  {new Date(m.played_at).toLocaleString("ko-KR")}
                </span>
              </div>
              <div className="mt-1 text-zinc-500 tabular-nums">
                팀 1: {m.team1_player1.name} {m.team1_player1_rating_before}→
                {m.team1_player1_rating_after} (
                {ratingDelta(m.team1_player1_rating_before, m.team1_player1_rating_after)}
                ), {m.team1_player2.name} {m.team1_player2_rating_before}→
                {m.team1_player2_rating_after} (
                {ratingDelta(m.team1_player2_rating_before, m.team1_player2_rating_after)}
                ) · 팀 2: {m.team2_player1.name} {m.team2_player1_rating_before}→
                {m.team2_player1_rating_after} (
                {ratingDelta(m.team2_player1_rating_before, m.team2_player1_rating_after)}
                ), {m.team2_player2.name} {m.team2_player2_rating_before}→
                {m.team2_player2_rating_after} (
                {ratingDelta(m.team2_player2_rating_before, m.team2_player2_rating_after)}
                )
              </div>
              <div className="mt-2 flex gap-3 text-sm">
                <Link href={`/matches/${m.id}/edit`} className="text-zinc-600 underline hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50">
                  수정
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  disabled={deletingId === m.id}
                  className="text-red-600 underline hover:text-red-800 disabled:opacity-50"
                >
                  {deletingId === m.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
