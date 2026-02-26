/*
  # Add session_type column to sessions table

  ## Summary
  Adds a `session_type` column to the `sessions` table to distinguish between
  different kinds of research sessions.

  ## Changes
  - `sessions` table: new `session_type` text column with default 'usability_test'

  ## Notes
  - All existing sessions receive the default value 'usability_test'
  - No data is lost; this is a purely additive migration
  - Valid values: 'usability_test', 'user_interview', 'client_working_group', 'guerrilla_testing'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE sessions ADD COLUMN session_type text NOT NULL DEFAULT 'usability_test';
  END IF;
END $$;
