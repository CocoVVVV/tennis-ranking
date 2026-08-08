"use client";

import { useState } from "react";

function PlayerSelect({ label, players, value, onChange, excludeIds }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{label}</label>
      <select
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled>
          선수 선택
        </option>
        {players
          .filter((p) => p.id === value || !excludeIds.includes(p.id))
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.rating})
            </option>
          ))}
      </select>
    </div>
  );
}

const emptyValues = {
  team1Player1Id: "",
  team1Player2Id: "",
  team2Player1Id: "",
  team2Player2Id: "",
  winningTeam: "1",
  score: "",
};

export default function MatchForm({
  players,
  initialValues,
  onSubmit,
  submitLabel,
  afterSuccess,
  resetAfterSuccess = false,
}) {
  const [values, setValues] = useState({ ...emptyValues, ...initialValues });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function setField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  const selectedIds = [
    values.team1Player1Id,
    values.team1Player2Id,
    values.team2Player1Id,
    values.team2Player2Id,
  ].filter(Boolean);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const {
      team1Player1Id,
      team1Player2Id,
      team2Player1Id,
      team2Player2Id,
      winningTeam,
      score,
    } = values;

    if (!team1Player1Id || !team1Player2Id || !team2Player1Id || !team2Player2Id) {
      setError("네 명의 선수를 모두 선택해주세요.");
      return;
    }
    if (new Set(selectedIds).size !== 4) {
      setError("같은 선수를 두 번 선택할 수 없습니다.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await onSubmit({
        team1Player1Id,
        team1Player2Id,
        team2Player1Id,
        team2Player2Id,
        winningTeam: Number(winningTeam),
        score: score.trim() || null,
      });
      setResult(data);
      if (resetAfterSuccess) setValues(emptyValues);
      if (afterSuccess) afterSuccess(data);
    } catch (err) {
      setError(err.message || "저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  if (players.length < 4) {
    return (
      <p className="text-sm text-zinc-500">
        복식 경기를 기록하려면 멤버가 4명 이상 필요합니다. 먼저 멤버 관리
        탭에서 멤버를 추가해주세요.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <p className="mb-2 text-sm font-semibold text-zinc-500">팀 1</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PlayerSelect
            label="선수 1"
            players={players}
            value={values.team1Player1Id}
            onChange={(v) => setField("team1Player1Id", v)}
            excludeIds={selectedIds}
          />
          <PlayerSelect
            label="선수 2"
            players={players}
            value={values.team1Player2Id}
            onChange={(v) => setField("team1Player2Id", v)}
            excludeIds={selectedIds}
          />
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-zinc-500">팀 2</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PlayerSelect
            label="선수 1"
            players={players}
            value={values.team2Player1Id}
            onChange={(v) => setField("team2Player1Id", v)}
            excludeIds={selectedIds}
          />
          <PlayerSelect
            label="선수 2"
            players={players}
            value={values.team2Player2Id}
            onChange={(v) => setField("team2Player2Id", v)}
            excludeIds={selectedIds}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">승리 팀</label>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="winningTeam"
              checked={values.winningTeam === "1"}
              onChange={() => setField("winningTeam", "1")}
            />
            팀 1 승리
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="winningTeam"
              checked={values.winningTeam === "2"}
              onChange={() => setField("winningTeam", "2")}
            />
            팀 2 승리
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">
          스코어 <span className="text-zinc-400">(선택 사항)</span>
        </label>
        <input
          type="text"
          placeholder="예: 6-3, 4-6, 7-5"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={values.score}
          onChange={(e) => setField("score", e.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {result ? (
        <p className="text-sm text-green-700 dark:text-green-400">
          저장되었습니다. 팀 1: {result.team1_player1_rating_before}→
          {result.team1_player1_rating_after}, {result.team1_player2_rating_before}→
          {result.team1_player2_rating_after} · 팀 2:{" "}
          {result.team2_player1_rating_before}→{result.team2_player1_rating_after},{" "}
          {result.team2_player2_rating_before}→{result.team2_player2_rating_after}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {submitting ? "저장 중..." : submitLabel}
      </button>
    </form>
  );
}
