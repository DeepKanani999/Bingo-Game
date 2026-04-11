/*
  Align player_marks.item_id with runtime app behavior.

  The app stores ticket marks using text item ids/values like "42",
  while the original schema defined player_marks.item_id as uuid
  referencing game_items. The current app no longer uses game_items
  for ticket generation, so marks must be stored as plain text.
*/

DO $$
BEGIN
  ALTER TABLE player_marks DROP CONSTRAINT IF EXISTS player_marks_item_id_fkey;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'player_marks'
      AND column_name = 'item_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE player_marks
      ALTER COLUMN item_id TYPE text USING item_id::text;
  END IF;
END $$;

