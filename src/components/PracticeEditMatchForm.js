"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import MatchForm from "@/components/MatchForm";

export default function PracticeEditMatchForm({ match, players }) {
  const router = useRouter();

  const initialValues = {
    team1Player1Id: match.team1_player1_id,
    team1Player2Id: match.team1_player2_id,
    team2Player1Id: match.team2_player1_id,
    team2Player2Id: match.team2_player2_id,
    winningTeam: String(match.winning_team),
    score: match.score || "",
  };

  async function handleSubmit(values) {
    const { data, error } = await supabase
      .rpc("edit_practice_match", {
        p_match_id: match.id,
        p_team1_player1_id: values.team1Player1Id,
        p_team1_player2_id: values.team1Player2Id,
        p_team2_player1_id: values.team2Player1Id,
        p_team2_player2_id: values.team2Player2Id,
        p_winning_team: values.winningTeam,
        p_score: values.score,
      })
      .single();

    if (error) throw error;

    return data;
  }

  return (
    <MatchForm
      players={players}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitLabel="수정 저장"
      afterSuccess={() => {
        router.push("/practice/matches");
        router.refresh();
      }}
    />
  );
}
