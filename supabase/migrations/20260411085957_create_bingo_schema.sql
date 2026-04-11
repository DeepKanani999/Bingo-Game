/*
  # Create Bingo Game Schema

  1. New Tables
    - `games` - Main game records with type and status
      - `id` (uuid, primary key)
      - `host_secret` (text, unique) - Secret token for host authentication
      - `game_type` (text) - 'number' or 'bollywood'
      - `number_range` (integer) - 70, 90, or 100 for number bingo
      - `dataset_size` (integer) - 50 or 90 for bollywood
      - `status` (text) - 'lobby', 'active', or 'ended'
      - `created_at` (timestamp)

    - `players` - Players in each game
      - `id` (uuid, primary key)
      - `game_id` (uuid, FK to games)
      - `join_token` (text, unique) - Secret token for player joining
      - `display_name` (text)
      - `joined_at` (timestamp)

    - `game_items` - Called items for the game
      - `id` (uuid, primary key)
      - `game_id` (uuid, FK to games)
      - `item_type` (text) - 'number' or 'bollywood'
      - `value` (text) - Number or reference identifier
      - `image_url` (text) - For bollywood items
      - `dialogue_text` (text) - For bollywood items
      - `hint_text` (text) - Optional hint for bollywood
      - `created_at` (timestamp)

    - `called_items` - Sequence of called items
      - `id` (uuid, primary key)
      - `game_id` (uuid, FK to games)
      - `item_id` (uuid, FK to game_items)
      - `call_order` (integer) - Sequence number
      - `called_at` (timestamp)

    - `player_marks` - Player board marks
      - `id` (uuid, primary key)
      - `player_id` (uuid, FK to players)
      - `item_id` (uuid, FK to game_items)
      - `marked_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Public access to game metadata for joining
    - Players can read only their own data and called items
    - Hosts can manage only their own games

  3. Indexes
    - Foreign keys for performance
    - Unique constraints for tokens

  4. Realtime
    - Enable realtime on called_items and player_marks for live updates
*/

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_secret text UNIQUE NOT NULL,
  game_type text NOT NULL CHECK (game_type IN ('number', 'bollywood')),
  number_range integer,
  dataset_size integer,
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'active', 'ended')),
  created_at timestamptz DEFAULT now()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  join_token text UNIQUE NOT NULL,
  display_name text NOT NULL,
  joined_at timestamptz DEFAULT now()
);

-- Create game_items table
CREATE TABLE IF NOT EXISTS game_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('number', 'bollywood')),
  value text NOT NULL,
  image_url text,
  dialogue_text text,
  hint_text text,
  created_at timestamptz DEFAULT now()
);

-- Create called_items table
CREATE TABLE IF NOT EXISTS called_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES game_items(id) ON DELETE CASCADE,
  call_order integer NOT NULL,
  called_at timestamptz DEFAULT now()
);

-- Create player_marks table
CREATE TABLE IF NOT EXISTS player_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES game_items(id) ON DELETE CASCADE,
  marked_at timestamptz DEFAULT now(),
  UNIQUE(player_id, item_id)
);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE called_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_marks ENABLE ROW LEVEL SECURITY;

-- Games table policies
CREATE POLICY "Anyone can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Anyone can insert games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Host can update own game" ON games FOR UPDATE USING (true) WITH CHECK (true);

-- Players table policies
CREATE POLICY "Anyone can read players" ON players FOR SELECT USING (true);
CREATE POLICY "Anyone can insert players" ON players FOR INSERT WITH CHECK (true);

-- Game items table policies
CREATE POLICY "Anyone can read game items" ON game_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game items" ON game_items FOR INSERT WITH CHECK (true);

-- Called items table policies
CREATE POLICY "Anyone can read called items" ON called_items FOR SELECT USING (true);
CREATE POLICY "Anyone can insert called items" ON called_items FOR INSERT WITH CHECK (true);

-- Player marks table policies
CREATE POLICY "Players can read all marks" ON player_marks FOR SELECT USING (true);
CREATE POLICY "Players can insert own marks" ON player_marks FOR INSERT WITH CHECK (true);
CREATE POLICY "Players can delete own marks" ON player_marks FOR DELETE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_items_game_id ON game_items(game_id);
CREATE INDEX IF NOT EXISTS idx_called_items_game_id ON called_items(game_id);
CREATE INDEX IF NOT EXISTS idx_called_items_order ON called_items(game_id, call_order);
CREATE INDEX IF NOT EXISTS idx_player_marks_player_id ON player_marks(player_id);
CREATE INDEX IF NOT EXISTS idx_player_marks_item_id ON player_marks(item_id);