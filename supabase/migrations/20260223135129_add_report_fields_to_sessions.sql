/*
  # Add Report Fields to Sessions

  Adds two nullable columns to the `sessions` table to store usability report submissions:

  ## New Columns
  - `report_url` (text, nullable) — The URL of the submitted report (either a user-provided link or a Supabase Storage URL for uploaded files)
  - `report_type` (text, nullable) — Indicates how the report was submitted: `'link'` for external URLs or `'file'` for uploaded files

  ## Notes
  - Both columns are nullable so existing sessions without a report are unaffected
  - No RLS changes needed; existing session policies already govern read/write access to the sessions table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'report_url'
  ) THEN
    ALTER TABLE sessions ADD COLUMN report_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'report_type'
  ) THEN
    ALTER TABLE sessions ADD COLUMN report_type text;
  END IF;
END $$;
