import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import SetupNotice from "@/components/SetupNotice";
import PracticeEditMatchForm from "@/components/PracticeEditMatchForm";

export const dynamic = "force-dynamic";

export default async function EditPracticeMatchPage({ params }) {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const { id } = await params;

  const [{ data: match, error: matchError }, { data: players, error: playersError }] =
    await Promise.all([
      supabase
        .from("practice_matches")
        .select(
          "id, team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, winning_team, score"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("players")
        .select("id, name, rating:practice_rating")
        .order("name", { ascending: true }),
    ]);

  if (matchError || playersError) {
    return (
      <p className="text-sm text-red-600">
        경기를 불러오지 못했습니다: {(matchError || playersError).message}
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">연습경기 기록 수정</h1>
      <PracticeEditMatchForm match={match} players={players} />
    </div>
  );
}
