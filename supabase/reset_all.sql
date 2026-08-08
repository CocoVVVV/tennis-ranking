-- Admin-only reset. Not linked from the app UI on purpose.
-- Run this manually in the Supabase SQL Editor whenever you want to wipe
-- every match record and reset every player's rating/record to a clean slate.
--
-- WARNING: this permanently deletes all match history. There is no undo.

truncate table matches;
update players set rating = 1200, wins = 0, losses = 0 where true;
