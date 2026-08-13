-- Tennis club ranking schema (v2: doubles matches)
-- Run this whole file in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run: it drops and recreates matches/functions, but keeps the players table.

create extension if not exists "pgcrypto";

-- players -------------------------------------------------------------

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  rating integer not null default 1200,
  wins integer not null default 0,
  losses integer not null default 0,
  practice_rating integer not null default 1200,
  practice_wins integer not null default 0,
  practice_losses integer not null default 0,
  created_at timestamptz not null default now()
);

-- In case players already existed from before "연습경기" was added.
alter table players add column if not exists practice_rating integer not null default 1200;
alter table players add column if not exists practice_wins integer not null default 0;
alter table players add column if not exists practice_losses integer not null default 0;

alter table players enable row level security;

drop policy if exists "players are publicly readable" on players;
create policy "players are publicly readable"
  on players for select
  using (true);

drop policy if exists "anyone can add a player" on players;
create policy "anyone can add a player"
  on players for insert
  with check (true);

-- matches (doubles: two players per team) ------------------------------

drop function if exists record_match(uuid, uuid, uuid, text);
drop table if exists matches cascade;

create table matches (
  id uuid primary key default gen_random_uuid(),
  team1_player1_id uuid not null references players(id),
  team1_player2_id uuid not null references players(id),
  team2_player1_id uuid not null references players(id),
  team2_player2_id uuid not null references players(id),
  winning_team smallint not null check (winning_team in (1, 2)),
  score text,
  team1_player1_rating_before integer not null,
  team1_player2_rating_before integer not null,
  team2_player1_rating_before integer not null,
  team2_player2_rating_before integer not null,
  team1_player1_rating_after integer not null,
  team1_player2_rating_after integer not null,
  team2_player1_rating_after integer not null,
  team2_player2_rating_after integer not null,
  played_at timestamptz not null default now(),
  constraint distinct_players check (
    team1_player1_id <> team1_player2_id and
    team1_player1_id <> team2_player1_id and
    team1_player1_id <> team2_player2_id and
    team1_player2_id <> team2_player1_id and
    team1_player2_id <> team2_player2_id and
    team2_player1_id <> team2_player2_id
  )
);

create index matches_played_at_idx on matches (played_at asc, id asc);

alter table matches enable row level security;

drop policy if exists "matches are publicly readable" on matches;
create policy "matches are publicly readable"
  on matches for select
  using (true);

-- Direct INSERT/UPDATE/DELETE on matches and UPDATE on players are
-- intentionally NOT granted to anon/authenticated. All writes go through
-- the security-definer functions below, so ratings and match history can
-- never drift apart from each other.

-- Replays every match in chronological order from scratch, recomputing
-- every player's rating/wins/losses and every match's before/after
-- snapshot. Called after any edit or delete so history stays consistent
-- even when an old match is corrected.
create or replace function recalculate_all_ratings()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_k constant numeric := 32;
  m record;
  v_t1_avg numeric;
  v_t2_avg numeric;
  v_exp1 numeric;
  v_actual1 numeric;
  v_delta1 integer;
  v_r_t1p1 integer;
  v_r_t1p2 integer;
  v_r_t2p1 integer;
  v_r_t2p2 integer;
  v_new_t1p1 integer;
  v_new_t1p2 integer;
  v_new_t2p1 integer;
  v_new_t2p2 integer;
begin
  update players set rating = 1200, wins = 0, losses = 0 where true;

  for m in select * from matches order by played_at asc, id asc loop
    select rating into v_r_t1p1 from players where id = m.team1_player1_id;
    select rating into v_r_t1p2 from players where id = m.team1_player2_id;
    select rating into v_r_t2p1 from players where id = m.team2_player1_id;
    select rating into v_r_t2p2 from players where id = m.team2_player2_id;

    v_t1_avg := (v_r_t1p1 + v_r_t1p2) / 2.0;
    v_t2_avg := (v_r_t2p1 + v_r_t2p2) / 2.0;
    v_exp1 := 1.0 / (1 + power(10, (v_t2_avg - v_t1_avg) / 400.0));
    v_actual1 := case when m.winning_team = 1 then 1 else 0 end;
    v_delta1 := round(v_k * (v_actual1 - v_exp1));

    v_new_t1p1 := v_r_t1p1 + v_delta1;
    v_new_t1p2 := v_r_t1p2 + v_delta1;
    v_new_t2p1 := v_r_t2p1 - v_delta1;
    v_new_t2p2 := v_r_t2p2 - v_delta1;

    update players set
        rating = v_new_t1p1,
        wins = wins + case when m.winning_team = 1 then 1 else 0 end,
        losses = losses + case when m.winning_team = 1 then 0 else 1 end
      where id = m.team1_player1_id;
    update players set
        rating = v_new_t1p2,
        wins = wins + case when m.winning_team = 1 then 1 else 0 end,
        losses = losses + case when m.winning_team = 1 then 0 else 1 end
      where id = m.team1_player2_id;
    update players set
        rating = v_new_t2p1,
        wins = wins + case when m.winning_team = 2 then 1 else 0 end,
        losses = losses + case when m.winning_team = 2 then 0 else 1 end
      where id = m.team2_player1_id;
    update players set
        rating = v_new_t2p2,
        wins = wins + case when m.winning_team = 2 then 1 else 0 end,
        losses = losses + case when m.winning_team = 2 then 0 else 1 end
      where id = m.team2_player2_id;

    update matches set
        team1_player1_rating_before = v_r_t1p1,
        team1_player2_rating_before = v_r_t1p2,
        team2_player1_rating_before = v_r_t2p1,
        team2_player2_rating_before = v_r_t2p2,
        team1_player1_rating_after = v_new_t1p1,
        team1_player2_rating_after = v_new_t1p2,
        team2_player1_rating_after = v_new_t2p1,
        team2_player2_rating_after = v_new_t2p2
      where id = m.id;
  end loop;
end;
$$;

-- Records a new doubles match. Since it is appended at the current
-- point in time, it can compute ratings directly from the players'
-- current values without a full replay.
create or replace function record_match(
  p_team1_player1_id uuid,
  p_team1_player2_id uuid,
  p_team2_player1_id uuid,
  p_team2_player2_id uuid,
  p_winning_team smallint,
  p_score text default null
)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_k constant numeric := 32;
  v_r_t1p1 integer;
  v_r_t1p2 integer;
  v_r_t2p1 integer;
  v_r_t2p2 integer;
  v_t1_avg numeric;
  v_t2_avg numeric;
  v_exp1 numeric;
  v_actual1 numeric;
  v_delta1 integer;
  v_new_t1p1 integer;
  v_new_t1p2 integer;
  v_new_t2p1 integer;
  v_new_t2p2 integer;
  v_match matches;
begin
  if p_winning_team not in (1, 2) then
    raise exception 'winning_team must be 1 or 2';
  end if;

  if p_team1_player1_id = p_team1_player2_id
    or p_team1_player1_id = p_team2_player1_id
    or p_team1_player1_id = p_team2_player2_id
    or p_team1_player2_id = p_team2_player1_id
    or p_team1_player2_id = p_team2_player2_id
    or p_team2_player1_id = p_team2_player2_id
  then
    raise exception 'A player cannot appear twice in the same match';
  end if;

  select rating into v_r_t1p1 from players where id = p_team1_player1_id for update;
  select rating into v_r_t1p2 from players where id = p_team1_player2_id for update;
  select rating into v_r_t2p1 from players where id = p_team2_player1_id for update;
  select rating into v_r_t2p2 from players where id = p_team2_player2_id for update;

  if v_r_t1p1 is null or v_r_t1p2 is null or v_r_t2p1 is null or v_r_t2p2 is null then
    raise exception 'Unknown player';
  end if;

  v_t1_avg := (v_r_t1p1 + v_r_t1p2) / 2.0;
  v_t2_avg := (v_r_t2p1 + v_r_t2p2) / 2.0;
  v_exp1 := 1.0 / (1 + power(10, (v_t2_avg - v_t1_avg) / 400.0));
  v_actual1 := case when p_winning_team = 1 then 1 else 0 end;
  v_delta1 := round(v_k * (v_actual1 - v_exp1));

  v_new_t1p1 := v_r_t1p1 + v_delta1;
  v_new_t1p2 := v_r_t1p2 + v_delta1;
  v_new_t2p1 := v_r_t2p1 - v_delta1;
  v_new_t2p2 := v_r_t2p2 - v_delta1;

  update players set
      rating = v_new_t1p1,
      wins = wins + case when p_winning_team = 1 then 1 else 0 end,
      losses = losses + case when p_winning_team = 1 then 0 else 1 end
    where id = p_team1_player1_id;
  update players set
      rating = v_new_t1p2,
      wins = wins + case when p_winning_team = 1 then 1 else 0 end,
      losses = losses + case when p_winning_team = 1 then 0 else 1 end
    where id = p_team1_player2_id;
  update players set
      rating = v_new_t2p1,
      wins = wins + case when p_winning_team = 2 then 1 else 0 end,
      losses = losses + case when p_winning_team = 2 then 0 else 1 end
    where id = p_team2_player1_id;
  update players set
      rating = v_new_t2p2,
      wins = wins + case when p_winning_team = 2 then 1 else 0 end,
      losses = losses + case when p_winning_team = 2 then 0 else 1 end
    where id = p_team2_player2_id;

  insert into matches (
    team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id,
    winning_team, score,
    team1_player1_rating_before, team1_player2_rating_before,
    team2_player1_rating_before, team2_player2_rating_before,
    team1_player1_rating_after, team1_player2_rating_after,
    team2_player1_rating_after, team2_player2_rating_after
  ) values (
    p_team1_player1_id, p_team1_player2_id, p_team2_player1_id, p_team2_player2_id,
    p_winning_team, p_score,
    v_r_t1p1, v_r_t1p2, v_r_t2p1, v_r_t2p2,
    v_new_t1p1, v_new_t1p2, v_new_t2p1, v_new_t2p2
  )
  returning * into v_match;

  return v_match;
end;
$$;

-- Edits an existing match's players/winner/score, then replays history
-- so every player's rating reflects the correction.
create or replace function edit_match(
  p_match_id uuid,
  p_team1_player1_id uuid,
  p_team1_player2_id uuid,
  p_team2_player1_id uuid,
  p_team2_player2_id uuid,
  p_winning_team smallint,
  p_score text default null
)
returns matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match matches;
begin
  if p_winning_team not in (1, 2) then
    raise exception 'winning_team must be 1 or 2';
  end if;

  if p_team1_player1_id = p_team1_player2_id
    or p_team1_player1_id = p_team2_player1_id
    or p_team1_player1_id = p_team2_player2_id
    or p_team1_player2_id = p_team2_player1_id
    or p_team1_player2_id = p_team2_player2_id
    or p_team2_player1_id = p_team2_player2_id
  then
    raise exception 'A player cannot appear twice in the same match';
  end if;

  update matches set
      team1_player1_id = p_team1_player1_id,
      team1_player2_id = p_team1_player2_id,
      team2_player1_id = p_team2_player1_id,
      team2_player2_id = p_team2_player2_id,
      winning_team = p_winning_team,
      score = p_score
    where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;

  perform recalculate_all_ratings();

  select * into v_match from matches where id = p_match_id;
  return v_match;
end;
$$;

-- Deletes a match and replays history so ratings no longer include it.
create or replace function delete_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from matches where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;

  perform recalculate_all_ratings();
end;
$$;

grant execute on function record_match(uuid, uuid, uuid, uuid, smallint, text) to anon, authenticated;
grant execute on function edit_match(uuid, uuid, uuid, uuid, uuid, smallint, text) to anon, authenticated;
grant execute on function delete_match(uuid) to anon, authenticated;

-- practice matches ("연습경기"): a second, independent Elo track that
-- shares the player roster but never touches official rating/wins/losses
-- or the official matches table. ----------------------------------------

drop table if exists practice_matches cascade;

create table practice_matches (
  id uuid primary key default gen_random_uuid(),
  team1_player1_id uuid not null references players(id),
  team1_player2_id uuid not null references players(id),
  team2_player1_id uuid not null references players(id),
  team2_player2_id uuid not null references players(id),
  winning_team smallint not null check (winning_team in (1, 2)),
  score text,
  team1_player1_rating_before integer not null,
  team1_player2_rating_before integer not null,
  team2_player1_rating_before integer not null,
  team2_player2_rating_before integer not null,
  team1_player1_rating_after integer not null,
  team1_player2_rating_after integer not null,
  team2_player1_rating_after integer not null,
  team2_player2_rating_after integer not null,
  played_at timestamptz not null default now(),
  constraint distinct_players check (
    team1_player1_id <> team1_player2_id and
    team1_player1_id <> team2_player1_id and
    team1_player1_id <> team2_player2_id and
    team1_player2_id <> team2_player1_id and
    team1_player2_id <> team2_player2_id and
    team2_player1_id <> team2_player2_id
  )
);

create index practice_matches_played_at_idx on practice_matches (played_at asc, id asc);

alter table practice_matches enable row level security;

drop policy if exists "practice matches are publicly readable" on practice_matches;
create policy "practice matches are publicly readable"
  on practice_matches for select
  using (true);

create or replace function recalculate_all_practice_ratings()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_k constant numeric := 32;
  m record;
  v_t1_avg numeric;
  v_t2_avg numeric;
  v_exp1 numeric;
  v_actual1 numeric;
  v_delta1 integer;
  v_r_t1p1 integer;
  v_r_t1p2 integer;
  v_r_t2p1 integer;
  v_r_t2p2 integer;
  v_new_t1p1 integer;
  v_new_t1p2 integer;
  v_new_t2p1 integer;
  v_new_t2p2 integer;
begin
  update players set practice_rating = 1200, practice_wins = 0, practice_losses = 0 where true;

  for m in select * from practice_matches order by played_at asc, id asc loop
    select practice_rating into v_r_t1p1 from players where id = m.team1_player1_id;
    select practice_rating into v_r_t1p2 from players where id = m.team1_player2_id;
    select practice_rating into v_r_t2p1 from players where id = m.team2_player1_id;
    select practice_rating into v_r_t2p2 from players where id = m.team2_player2_id;

    v_t1_avg := (v_r_t1p1 + v_r_t1p2) / 2.0;
    v_t2_avg := (v_r_t2p1 + v_r_t2p2) / 2.0;
    v_exp1 := 1.0 / (1 + power(10, (v_t2_avg - v_t1_avg) / 400.0));
    v_actual1 := case when m.winning_team = 1 then 1 else 0 end;
    v_delta1 := round(v_k * (v_actual1 - v_exp1));

    v_new_t1p1 := v_r_t1p1 + v_delta1;
    v_new_t1p2 := v_r_t1p2 + v_delta1;
    v_new_t2p1 := v_r_t2p1 - v_delta1;
    v_new_t2p2 := v_r_t2p2 - v_delta1;

    update players set
        practice_rating = v_new_t1p1,
        practice_wins = practice_wins + case when m.winning_team = 1 then 1 else 0 end,
        practice_losses = practice_losses + case when m.winning_team = 1 then 0 else 1 end
      where id = m.team1_player1_id;
    update players set
        practice_rating = v_new_t1p2,
        practice_wins = practice_wins + case when m.winning_team = 1 then 1 else 0 end,
        practice_losses = practice_losses + case when m.winning_team = 1 then 0 else 1 end
      where id = m.team1_player2_id;
    update players set
        practice_rating = v_new_t2p1,
        practice_wins = practice_wins + case when m.winning_team = 2 then 1 else 0 end,
        practice_losses = practice_losses + case when m.winning_team = 2 then 0 else 1 end
      where id = m.team2_player1_id;
    update players set
        practice_rating = v_new_t2p2,
        practice_wins = practice_wins + case when m.winning_team = 2 then 1 else 0 end,
        practice_losses = practice_losses + case when m.winning_team = 2 then 0 else 1 end
      where id = m.team2_player2_id;

    update practice_matches set
        team1_player1_rating_before = v_r_t1p1,
        team1_player2_rating_before = v_r_t1p2,
        team2_player1_rating_before = v_r_t2p1,
        team2_player2_rating_before = v_r_t2p2,
        team1_player1_rating_after = v_new_t1p1,
        team1_player2_rating_after = v_new_t1p2,
        team2_player1_rating_after = v_new_t2p1,
        team2_player2_rating_after = v_new_t2p2
      where id = m.id;
  end loop;
end;
$$;

create or replace function record_practice_match(
  p_team1_player1_id uuid,
  p_team1_player2_id uuid,
  p_team2_player1_id uuid,
  p_team2_player2_id uuid,
  p_winning_team smallint,
  p_score text default null
)
returns practice_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_k constant numeric := 32;
  v_r_t1p1 integer;
  v_r_t1p2 integer;
  v_r_t2p1 integer;
  v_r_t2p2 integer;
  v_t1_avg numeric;
  v_t2_avg numeric;
  v_exp1 numeric;
  v_actual1 numeric;
  v_delta1 integer;
  v_new_t1p1 integer;
  v_new_t1p2 integer;
  v_new_t2p1 integer;
  v_new_t2p2 integer;
  v_match practice_matches;
begin
  if p_winning_team not in (1, 2) then
    raise exception 'winning_team must be 1 or 2';
  end if;

  if p_team1_player1_id = p_team1_player2_id
    or p_team1_player1_id = p_team2_player1_id
    or p_team1_player1_id = p_team2_player2_id
    or p_team1_player2_id = p_team2_player1_id
    or p_team1_player2_id = p_team2_player2_id
    or p_team2_player1_id = p_team2_player2_id
  then
    raise exception 'A player cannot appear twice in the same match';
  end if;

  select practice_rating into v_r_t1p1 from players where id = p_team1_player1_id for update;
  select practice_rating into v_r_t1p2 from players where id = p_team1_player2_id for update;
  select practice_rating into v_r_t2p1 from players where id = p_team2_player1_id for update;
  select practice_rating into v_r_t2p2 from players where id = p_team2_player2_id for update;

  if v_r_t1p1 is null or v_r_t1p2 is null or v_r_t2p1 is null or v_r_t2p2 is null then
    raise exception 'Unknown player';
  end if;

  v_t1_avg := (v_r_t1p1 + v_r_t1p2) / 2.0;
  v_t2_avg := (v_r_t2p1 + v_r_t2p2) / 2.0;
  v_exp1 := 1.0 / (1 + power(10, (v_t2_avg - v_t1_avg) / 400.0));
  v_actual1 := case when p_winning_team = 1 then 1 else 0 end;
  v_delta1 := round(v_k * (v_actual1 - v_exp1));

  v_new_t1p1 := v_r_t1p1 + v_delta1;
  v_new_t1p2 := v_r_t1p2 + v_delta1;
  v_new_t2p1 := v_r_t2p1 - v_delta1;
  v_new_t2p2 := v_r_t2p2 - v_delta1;

  update players set
      practice_rating = v_new_t1p1,
      practice_wins = practice_wins + case when p_winning_team = 1 then 1 else 0 end,
      practice_losses = practice_losses + case when p_winning_team = 1 then 0 else 1 end
    where id = p_team1_player1_id;
  update players set
      practice_rating = v_new_t1p2,
      practice_wins = practice_wins + case when p_winning_team = 1 then 1 else 0 end,
      practice_losses = practice_losses + case when p_winning_team = 1 then 0 else 1 end
    where id = p_team1_player2_id;
  update players set
      practice_rating = v_new_t2p1,
      practice_wins = practice_wins + case when p_winning_team = 2 then 1 else 0 end,
      practice_losses = practice_losses + case when p_winning_team = 2 then 0 else 1 end
    where id = p_team2_player1_id;
  update players set
      practice_rating = v_new_t2p2,
      practice_wins = practice_wins + case when p_winning_team = 2 then 1 else 0 end,
      practice_losses = practice_losses + case when p_winning_team = 2 then 0 else 1 end
    where id = p_team2_player2_id;

  insert into practice_matches (
    team1_player1_id, team1_player2_id, team2_player1_id, team2_player2_id,
    winning_team, score,
    team1_player1_rating_before, team1_player2_rating_before,
    team2_player1_rating_before, team2_player2_rating_before,
    team1_player1_rating_after, team1_player2_rating_after,
    team2_player1_rating_after, team2_player2_rating_after
  ) values (
    p_team1_player1_id, p_team1_player2_id, p_team2_player1_id, p_team2_player2_id,
    p_winning_team, p_score,
    v_r_t1p1, v_r_t1p2, v_r_t2p1, v_r_t2p2,
    v_new_t1p1, v_new_t1p2, v_new_t2p1, v_new_t2p2
  )
  returning * into v_match;

  return v_match;
end;
$$;

create or replace function edit_practice_match(
  p_match_id uuid,
  p_team1_player1_id uuid,
  p_team1_player2_id uuid,
  p_team2_player1_id uuid,
  p_team2_player2_id uuid,
  p_winning_team smallint,
  p_score text default null
)
returns practice_matches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match practice_matches;
begin
  if p_winning_team not in (1, 2) then
    raise exception 'winning_team must be 1 or 2';
  end if;

  if p_team1_player1_id = p_team1_player2_id
    or p_team1_player1_id = p_team2_player1_id
    or p_team1_player1_id = p_team2_player2_id
    or p_team1_player2_id = p_team2_player1_id
    or p_team1_player2_id = p_team2_player2_id
    or p_team2_player1_id = p_team2_player2_id
  then
    raise exception 'A player cannot appear twice in the same match';
  end if;

  update practice_matches set
      team1_player1_id = p_team1_player1_id,
      team1_player2_id = p_team1_player2_id,
      team2_player1_id = p_team2_player1_id,
      team2_player2_id = p_team2_player2_id,
      winning_team = p_winning_team,
      score = p_score
    where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;

  perform recalculate_all_practice_ratings();

  select * into v_match from practice_matches where id = p_match_id;
  return v_match;
end;
$$;

create or replace function delete_practice_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from practice_matches where id = p_match_id;

  if not found then
    raise exception 'Match not found';
  end if;

  perform recalculate_all_practice_ratings();
end;
$$;

grant execute on function record_practice_match(uuid, uuid, uuid, uuid, smallint, text) to anon, authenticated;
grant execute on function edit_practice_match(uuid, uuid, uuid, uuid, uuid, smallint, text) to anon, authenticated;
grant execute on function delete_practice_match(uuid) to anon, authenticated;
