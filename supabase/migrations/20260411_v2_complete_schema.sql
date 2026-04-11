/*
  Bingo PWA v2 — Complete Schema
  
  Changes from v1:
  1. ALTER games: add game_name, host_name, max_players, auto_call, call_interval, ticket_size, game_code
  2. ALTER games: expand game_type to include 'custom'
  3. NEW TABLE: player_tickets — persisted 5x5/3x9/9x10 boards per player
  4. NEW TABLE: claims — player claim submissions with auto-validation
  5. NEW TABLE: bollywood_mappings — host-editable number→movie mappings per game
  6. NEW TABLE: game_templates — reusable game configurations
  7. ALTER called_items: make item_id TEXT (stores value directly, not FK)
  8. Updated RLS policies for full operations
*/

-- ============================================================
-- 1. ALTER games table
-- ============================================================
ALTER TABLE games 
  DROP CONSTRAINT IF EXISTS games_game_type_check;

ALTER TABLE games 
  ADD CONSTRAINT games_game_type_check 
  CHECK (game_type IN ('number', 'bollywood', 'custom'));

-- Add new columns (IF NOT EXISTS via DO block for safety)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='game_name') THEN
    ALTER TABLE games ADD COLUMN game_name text DEFAULT 'Bingo Game';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='host_name') THEN
    ALTER TABLE games ADD COLUMN host_name text DEFAULT 'Host';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='max_players') THEN
    ALTER TABLE games ADD COLUMN max_players integer DEFAULT 20;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='auto_call') THEN
    ALTER TABLE games ADD COLUMN auto_call boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='call_interval') THEN
    ALTER TABLE games ADD COLUMN call_interval integer DEFAULT 10;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='ticket_size') THEN
    ALTER TABLE games ADD COLUMN ticket_size text DEFAULT '5x5' CHECK (ticket_size IN ('5x5', '3x9', '9x10'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='game_code') THEN
    ALTER TABLE games ADD COLUMN game_code text UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='auto_call_active') THEN
    ALTER TABLE games ADD COLUMN auto_call_active boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='paused') THEN
    ALTER TABLE games ADD COLUMN paused boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 2. Player Tickets — persisted boards
-- ============================================================
CREATE TABLE IF NOT EXISTS player_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  ticket_data jsonb NOT NULL, -- Array of cell objects with position and value
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id, game_id)
);

ALTER TABLE player_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read tickets" ON player_tickets FOR SELECT USING (true);
CREATE POLICY "Anyone can insert tickets" ON player_tickets FOR INSERT WITH CHECK (true);

-- ============================================================
-- 3. Claims — player claim submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  claim_type text NOT NULL CHECK (claim_type IN ('row', 'column', 'diagonal', 'full_house')),
  claim_data jsonb NOT NULL, -- The cells/pattern being claimed
  is_valid boolean,
  validation_reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read claims" ON claims FOR SELECT USING (true);
CREATE POLICY "Anyone can insert claims" ON claims FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update claims" ON claims FOR UPDATE USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Bollywood Mappings — host-editable per game
-- ============================================================
CREATE TABLE IF NOT EXISTS bollywood_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  number integer NOT NULL,
  movie_name text NOT NULL,
  image_url text,
  dialogue text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, number)
);

ALTER TABLE bollywood_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read mappings" ON bollywood_mappings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert mappings" ON bollywood_mappings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update mappings" ON bollywood_mappings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete mappings" ON bollywood_mappings FOR DELETE USING (true);

-- ============================================================
-- 5. Game Templates — reusable configurations
-- ============================================================
CREATE TABLE IF NOT EXISTS game_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  game_type text NOT NULL CHECK (game_type IN ('number', 'bollywood', 'custom')),
  ticket_size text DEFAULT '5x5',
  number_range integer,
  dataset_size integer,
  mappings_data jsonb, -- Snapshot of bollywood mappings
  settings jsonb, -- Additional settings
  created_at timestamptz DEFAULT now()
);

ALTER TABLE game_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read templates" ON game_templates FOR SELECT USING (true);
CREATE POLICY "Anyone can insert templates" ON game_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update templates" ON game_templates FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete templates" ON game_templates FOR DELETE USING (true);

-- ============================================================
-- 6. Fix called_items — drop FK constraint, make item_id text
-- ============================================================
-- Drop the FK constraint on item_id if it exists
DO $$
BEGIN
  -- Try to drop the FK. It may not exist if the column was already text.
  ALTER TABLE called_items DROP CONSTRAINT IF EXISTS called_items_item_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Change item_id to text type if it's uuid
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'called_items' AND column_name = 'item_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE called_items ALTER COLUMN item_id TYPE text USING item_id::text;
  END IF;
END $$;

-- ============================================================
-- 7. Add UPDATE/DELETE policies to existing tables
-- ============================================================
-- Players: allow updates (rename) and deletes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'Anyone can update players') THEN
    CREATE POLICY "Anyone can update players" ON players FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'Anyone can delete players') THEN
    CREATE POLICY "Anyone can delete players" ON players FOR DELETE USING (true);
  END IF;
END $$;

-- Called items: allow updates and deletes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'called_items' AND policyname = 'Anyone can update called items') THEN
    CREATE POLICY "Anyone can update called items" ON called_items FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'called_items' AND policyname = 'Anyone can delete called items') THEN
    CREATE POLICY "Anyone can delete called items" ON called_items FOR DELETE USING (true);
  END IF;
END $$;

-- Games: allow delete
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'games' AND policyname = 'Anyone can delete games') THEN
    CREATE POLICY "Anyone can delete games" ON games FOR DELETE USING (true);
  END IF;
END $$;

-- ============================================================
-- 8. Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_player_tickets_player ON player_tickets(player_id);
CREATE INDEX IF NOT EXISTS idx_player_tickets_game ON player_tickets(game_id);
CREATE INDEX IF NOT EXISTS idx_claims_game ON claims(game_id);
CREATE INDEX IF NOT EXISTS idx_claims_player ON claims(player_id);
CREATE INDEX IF NOT EXISTS idx_bollywood_mappings_game ON bollywood_mappings(game_id);
CREATE INDEX IF NOT EXISTS idx_games_code ON games(game_code);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);

-- ============================================================
-- 9. Enable Realtime on key tables
-- ============================================================
-- Note: Run these in Supabase Dashboard > Database > Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE called_items;
-- ALTER PUBLICATION supabase_realtime ADD TABLE player_marks;
-- ALTER PUBLICATION supabase_realtime ADD TABLE players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE claims;
-- ALTER PUBLICATION supabase_realtime ADD TABLE games;
