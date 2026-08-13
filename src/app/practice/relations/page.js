import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import SetupNotice from "@/components/SetupNotice";
import RelationsExplorer from "@/components/RelationsExplorer";

export const dynamic = "force-dynamic";

export default async function PracticeRelationsPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const [{ data: players, error: playersError }, { data: matches, error: matchesError }] =
    await Promise.all([
      supabase.from("players").select("id, name").order("name", { ascending: true }),
      supabase
        .from("practice_matches")
        .select(
          "team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id, winning_team"
        ),
    ]);

  if (playersError || matchesError) {
    return (
      <p className="text-sm text-red-600">
        데이터를 불러오지 못했습니다: {(playersError || matchesError).message}
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">연습경기 관계</h1>
      <RelationsExplorer players={players} matches={matches} />
    </div>
  );
}
