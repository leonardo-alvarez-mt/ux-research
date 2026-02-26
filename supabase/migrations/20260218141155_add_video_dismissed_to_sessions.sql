/*
  # Add video_dismissed column to sessions

  ## Summary
  Adds a boolean flag to track whether the demo video banner has been dismissed for a session.

  ## Changes
  - `sessions` table: New column `video_dismissed` (boolean, default false)
    - When false, the demo video banner is shown on the session detail page
    - When true, the banner has been dismissed by the session owner or an editor

  ## Notes
  1. Defaults to false so all existing sessions will show the banner until dismissed
  2. No RLS changes needed — the existing sessions UPDATE policy covers this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'video_dismissed'
  ) THEN
    ALTER TABLE sessions ADD COLUMN video_dismissed boolean NOT NULL DEFAULT false;
  END IF;
END $$;
