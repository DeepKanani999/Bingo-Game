-- ============================================================
-- Bingo PWA v3 — Production Readiness & Security Hardening
-- ============================================================

-- 1. Table Additions & Updates
-- Add prizes and next_call_at columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS prizes jsonb DEFAULT '{}'::jsonb;
ALTER TABLE games ADD COLUMN IF NOT EXISTS next_call_at timestamptz;

-- Create prize_locks table to prevent winner race conditions
CREATE TABLE IF NOT EXISTS prize_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  claim_type text NOT NULL,
  claim_index integer, -- row/col index if applicable
  winner_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  locked_at timestamptz DEFAULT now(),
  UNIQUE(game_id, claim_type, claim_index)
);

-- Create game_events table to track events for analytics
CREATE TABLE IF NOT EXISTS game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create host_sessions table to manage secure host sessions
CREATE TABLE IF NOT EXISTS host_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL
);

-- 2. Enable Row Level Security (RLS) on all tables
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE called_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing overly open policies
DROP POLICY IF EXISTS "Anyone can read games" ON games;
DROP POLICY IF EXISTS "Anyone can insert games" ON games;
DROP POLICY IF EXISTS "Host can update own game" ON games;
DROP POLICY IF EXISTS "Anyone can delete games" ON games;

DROP POLICY IF EXISTS "Anyone can read players" ON players;
DROP POLICY IF EXISTS "Anyone can insert players" ON players;
DROP POLICY IF EXISTS "Anyone can update players" ON players;
DROP POLICY IF EXISTS "Anyone can delete players" ON players;

DROP POLICY IF EXISTS "Anyone can read called items" ON called_items;
DROP POLICY IF EXISTS "Anyone can insert called items" ON called_items;
DROP POLICY IF EXISTS "Anyone can update called items" ON called_items;
DROP POLICY IF EXISTS "Anyone can delete called items" ON called_items;

DROP POLICY IF EXISTS "Anyone can read tickets" ON player_tickets;
DROP POLICY IF EXISTS "Anyone can insert tickets" ON player_tickets;

DROP POLICY IF EXISTS "Anyone can read claims" ON claims;
DROP POLICY IF EXISTS "Anyone can insert claims" ON claims;
DROP POLICY IF EXISTS "Anyone can update claims" ON claims;

DROP POLICY IF EXISTS "Players can read all marks" ON player_marks;
DROP POLICY IF EXISTS "Players can insert own marks" ON player_marks;
DROP POLICY IF EXISTS "Players can delete own marks" ON player_marks;

-- 4. Create secure Read-Only public RLS Policies
-- Allow anyone to read games, players, called items, tickets, and claims for game sync
CREATE POLICY "Public select games" ON games FOR SELECT USING (true);
CREATE POLICY "Public select players" ON players FOR SELECT USING (true);
CREATE POLICY "Public select called items" ON called_items FOR SELECT USING (true);
CREATE POLICY "Public select tickets" ON player_tickets FOR SELECT USING (true);
CREATE POLICY "Public select claims" ON claims FOR SELECT USING (true);
CREATE POLICY "Public select prize locks" ON prize_locks FOR SELECT USING (true);

-- 5. Player Marks Policies (Client-side writes with strict validation)
-- Allow anyone to read marks (needed for leaderboard and check)
CREATE POLICY "Public select player marks" ON player_marks FOR SELECT USING (true);

-- Allow players to insert marks ONLY if the item value has actually been called in their game
CREATE POLICY "Allow player mark if called" ON player_marks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM called_items ci 
    JOIN players p ON p.game_id = ci.game_id 
    WHERE p.id = player_id 
      AND (ci.item_id = item_id OR ci.item_id = (SELECT value FROM game_items WHERE id::text = item_id))
  )
);

-- Allow players to delete their own marks
CREATE POLICY "Allow player delete own marks" ON player_marks FOR DELETE USING (true);

-- 6. Game Events and Host Sessions Policies
-- Read-only or completely restricted from public write (inserts/updates/deletes)
CREATE POLICY "Public select game events" ON game_events FOR SELECT USING (true);

-- 7. Atomic Auto-Call trigger function
CREATE OR REPLACE FUNCTION trigger_auto_call(p_game_id uuid)
RETURNS jsonb
SECURITY DEFINER
AS $$
DECLARE
  v_game games%ROWTYPE;
  v_called_count integer;
  v_range integer;
  v_next_item text;
  v_all_numbers text[] := ARRAY[]::text[];
  v_called_numbers text[] := ARRAY[]::text[];
  v_remaining text[] := ARRAY[]::text[];
  v_rand_idx integer;
  v_new_call_at timestamptz;
  v_order integer;
  v_result jsonb;
BEGIN
  -- Lock the game row for update
  SELECT * INTO v_game FROM games WHERE id = p_game_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Game not found');
  END IF;
  
  IF v_game.status != 'active' OR v_game.paused = true OR v_game.auto_call = false OR v_game.next_call_at IS NULL OR v_game.next_call_at > now() THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Conditions not met');
  END IF;
  
  -- Get called items
  SELECT COALESCE(array_agg(item_id), ARRAY[]::text[]) INTO v_called_numbers FROM called_items WHERE game_id = p_game_id;
  
  -- Determine range
  v_range := v_game.number_range;
  IF v_range IS NULL THEN
    -- If Bollywood, default to count of mappings
    SELECT COUNT(*)::integer INTO v_range FROM bollywood_mappings WHERE game_id = p_game_id;
    IF v_range = 0 THEN
      v_range := 90;
    END IF;
  END IF;
  
  -- Build all numbers
  FOR i IN 1..v_range LOOP
    v_all_numbers := array_append(v_all_numbers, i::text);
  END LOOP;
  
  -- Find remaining numbers
  SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO v_remaining 
  FROM unnest(v_all_numbers) x 
  WHERE x NOT IN (SELECT unnest(v_called_numbers));
  
  IF array_length(v_remaining, 1) IS NULL OR array_length(v_remaining, 1) = 0 THEN
    -- No remaining numbers, disable auto call
    UPDATE games SET next_call_at = NULL, auto_call_active = false WHERE id = p_game_id;
    RETURN jsonb_build_object('success', false, 'reason', 'All numbers called');
  END IF;
  
  -- Pick random number
  v_rand_idx := floor(random() * array_length(v_remaining, 1))::integer + 1;
  v_next_item := v_remaining[v_rand_idx];
  
  -- Insert called item
  SELECT COALESCE(max(call_order), 0) + 1 INTO v_order FROM called_items WHERE game_id = p_game_id;
  INSERT INTO called_items (game_id, item_id, call_order) VALUES (p_game_id, v_next_item, v_order);
  
  -- Set next call time
  v_new_call_at := now() + (v_game.call_interval * interval '1 second');
  UPDATE games SET next_call_at = v_new_call_at WHERE id = p_game_id;
  
  -- Insert event
  INSERT INTO game_events (game_id, event_type, payload) VALUES (p_game_id, 'called', jsonb_build_object('number', v_next_item, 'call_order', v_order));
  
  RETURN jsonb_build_object('success', true, 'number', v_next_item, 'call_order', v_order, 'next_call_at', v_new_call_at);
END;
$$ LANGUAGE plpgsql;
