import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import SetupNotice from "@/components/SetupNotice";
import MatchesList from "@/components/MatchesList";

export const dynamic = "force-dynamic";

export default async function PracticeMatchesPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const { data: matches, error } = await supabase
    .from("practice_matches")
    .select(
      `
      id, score, played_at, winning_team,
      team1_player1_rating_before, team1_player2_rating_before,
      team2_player1_rating_before, team2_player2_rating_before,
      team1_player1_rating_after, team1_player2_rating_after,
      team2_player1_rating_after, team2_player2_rating_after,
      team1_player1:team1_player1_id ( id, name ),
      team1_player2:team1_player2_id ( id, name ),
      team2_player1:team2_player1_id ( id, name ),
      team2_player2:team2_player2_id ( id, name )
    `
    )
    .order("played_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <p className="text-sm text-red-600">
        연습경기 기록을 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">연습경기 기록</h1>

      {matches.length === 0 ? (
        <p className="text-orange-800/70 dark:text-orange-200/70">
          아직 기록된 연습경기가 없습니다.
        </p>
      ) : (
        <MatchesList
          matches={matches}
          deleteRpc="delete_practice_match"
          editHrefBase="/practice/matches"
        />
      )}
    </div>
  );
}
