import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import SetupNotice from "@/components/SetupNotice";
import AddMemberForm from "@/components/AddMemberForm";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const { data: players, error } = await supabase
    .from("players")
    .select("id, name, rating, wins, losses")
    .order("name", { ascending: true });

  if (error) {
    return (
      <p className="text-sm text-red-600">
        멤버 목록을 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">멤버 관리</h1>

      <AddMemberForm />

      <ul className="mt-6 flex flex-col gap-2">
        {players.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
          >
            <span className="font-medium">{p.name}</span>
            <span className="text-zinc-500 tabular-nums">
              레이팅 {p.rating} · {p.wins}승 {p.losses}패
            </span>
          </li>
        ))}
      </ul>

      {players.length === 0 ? (
        <p className="mt-4 text-zinc-500">아직 등록된 멤버가 없습니다.</p>
      ) : null}
    </div>
  );
}
