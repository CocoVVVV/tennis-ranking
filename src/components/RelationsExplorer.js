"use client";

import { useMemo, useState } from "react";

function computeRelations(matches, playerId) {
  const partnerStats = new Map(); // id -> { wins, losses }
  const opponentStats = new Map(); // id -> { winsAgainst, lossesAgainst }

  function bump(map, id, field) {
    const entry = map.get(id) || { wins: 0, losses: 0, winsAgainst: 0, lossesAgainst: 0 };
    entry[field] += 1;
    map.set(id, entry);
  }

  for (const m of matches) {
    const team1 = [m.team1_player1_id, m.team1_player2_id];
    const team2 = [m.team2_player1_id, m.team2_player2_id];

    let myTeam, otherTeam, myTeamNumber;
    if (team1.includes(playerId)) {
      myTeam = team1;
      otherTeam = team2;
      myTeamNumber = 1;
    } else if (team2.includes(playerId)) {
      myTeam = team2;
      otherTeam = team1;
      myTeamNumber = 2;
    } else {
      continue;
    }

    const partnerId = myTeam.find((id) => id !== playerId);
    const won = m.winning_team === myTeamNumber;

    bump(partnerStats, partnerId, won ? "wins" : "losses");
    for (const oppId of otherTeam) {
      bump(opponentStats, oppId, won ? "winsAgainst" : "lossesAgainst");
    }
  }

  const partners = Array.from(partnerStats.entries()).map(([id, s]) => ({
    id,
    wins: s.wins,
    losses: s.losses,
    games: s.wins + s.losses,
    winRate: s.wins / (s.wins + s.losses),
  }));

  const opponents = Array.from(opponentStats.entries()).map(([id, s]) => ({
    id,
    winsAgainst: s.winsAgainst,
    lossesAgainst: s.lossesAgainst,
    winRate: s.winsAgainst / (s.winsAgainst + s.lossesAgainst),
  }));

  return { partners, opponents };
}

function NameList({ items, emptyLabel, renderLine }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }
  return (
    <ol className="flex flex-col gap-1 text-sm">
      {items.map((item, i) => (
        <li key={item.id} className="flex items-baseline gap-2">
          <span className="text-zinc-400">{i + 1}.</span>
          {renderLine(item)}
        </li>
      ))}
    </ol>
  );
}

export default function RelationsExplorer({ players, matches }) {
  const [playerId, setPlayerId] = useState("");
  const nameById = useMemo(() => {
    const map = new Map();
    for (const p of players) map.set(p.id, p.name);
    return map;
  }, [players]);

  const { partners, opponents } = useMemo(() => {
    if (!playerId) return { partners: [], opponents: [] };
    return computeRelations(matches, playerId);
  }, [matches, playerId]);

  const bestPartners = [...partners].sort((a, b) => b.winRate - a.winRate).slice(0, 3);
  const worstPartners = [...partners].sort((a, b) => a.winRate - b.winRate).slice(0, 3);
  const topOpponents = [...opponents]
    .sort((a, b) => b.winRate - a.winRate || b.winsAgainst - a.winsAgainst)
    .slice(0, 3);
  const bottomOpponents = [...opponents]
    .sort((a, b) => a.winRate - b.winRate || b.winsAgainst - a.winsAgainst)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">선수 선택</label>
        <select
          className="max-w-xs rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          value={playerId}
          onChange={(e) => setPlayerId(e.target.value)}
        >
          <option value="">선수를 선택하세요</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {playerId ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-zinc-500">
              🤝 페어 승률이 좋은 상대 Top 3
            </h2>
            <NameList
              items={bestPartners}
              emptyLabel="함께 페어를 한 경기가 없습니다."
              renderLine={(item) => (
                <span>
                  {nameById.get(item.id)}{" "}
                  <span className="text-zinc-500 tabular-nums">
                    ({Math.round(item.winRate * 100)}%, {item.wins}승 {item.losses}패)
                  </span>
                </span>
              )}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-zinc-500">
              💔 페어 승률이 낮은 상대 Top 3
            </h2>
            <NameList
              items={worstPartners}
              emptyLabel="함께 페어를 한 경기가 없습니다."
              renderLine={(item) => (
                <span>
                  {nameById.get(item.id)}{" "}
                  <span className="text-zinc-500 tabular-nums">
                    ({Math.round(item.winRate * 100)}%, {item.wins}승 {item.losses}패)
                  </span>
                </span>
              )}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-zinc-500">
              🔥 상대 전적 상위 Top 3
            </h2>
            <NameList
              items={topOpponents}
              emptyLabel="맞대결한 상대가 없습니다."
              renderLine={(item) => (
                <span>
                  {nameById.get(item.id)}{" "}
                  <span className="text-zinc-500 tabular-nums">
                    ({Math.round(item.winRate * 100)}%, {item.winsAgainst}승{" "}
                    {item.lossesAgainst}패)
                  </span>
                </span>
              )}
            />
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold text-zinc-500">
              😵 상대 전적 하위 Top 3
            </h2>
            <NameList
              items={bottomOpponents}
              emptyLabel="맞대결한 상대가 없습니다."
              renderLine={(item) => (
                <span>
                  {nameById.get(item.id)}{" "}
                  <span className="text-zinc-500 tabular-nums">
                    ({Math.round(item.winRate * 100)}%, {item.winsAgainst}승{" "}
                    {item.lossesAgainst}패)
                  </span>
                </span>
              )}
            />
          </section>
        </div>
      ) : null}
    </div>
  );
}
