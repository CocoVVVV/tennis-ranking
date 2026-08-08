import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import SetupNotice from "@/components/SetupNotice";
import RecordForm from "@/components/RecordForm";

export const dynamic = "force-dynamic";

export default async function RecordPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, rating")
    .order("name", { ascending: true });

  if (error) {
    return (
      <p className="text-sm text-red-600">
        선수 목록을 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">경기 결과 입력</h1>
      <RecordForm players={players} />
    </div>
  );
}
