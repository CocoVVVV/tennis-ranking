"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import MatchForm from "@/components/MatchForm";

export default function PracticeRecordForm({ players }) {
  const router = useRouter();

  async function handleSubmit(values) {
    const { data, error } = await supabase
      .rpc("record_practice_match", {
        p_team1_player1_id: values.team1Player1Id,
        p_team1_player2_id: values.team1Player2Id,
        p_team2_player1_id: values.team2Player1Id,
        p_team2_player2_id: values.team2Player2Id,
        p_winning_team: values.winningTeam,
        p_score: values.score,
      })
      .single();

    if (error) throw error;

    router.refresh();
    return data;
  }

  return (
    <MatchForm
      players={players}
      onSubmit={handleSubmit}
      submitLabel="연습경기 결과 저장"
      resetAfterSuccess
    />
  );
}
