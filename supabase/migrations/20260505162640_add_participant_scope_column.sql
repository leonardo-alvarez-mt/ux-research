/*
  # Add participant_scope column to participants

  ## Summary
  Adds a `participant_scope` column to distinguish between External (customer)
  and Internal (employee/team) participants in the Participant Roster.

  ## Changes
  ### Modified Tables
  - `participants`
    - `participant_scope` (text, NOT NULL, DEFAULT 'external') — values: 'external' | 'internal'
      All existing rows will default to 'external', preserving current data.

  ## Notes
  - Non-destructive: existing records receive 'external' automatically
  - No RLS changes needed; existing policies already govern participant access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'participants' AND column_name = 'participant_scope'
  ) THEN
    ALTER TABLE participants
      ADD COLUMN participant_scope text NOT NULL DEFAULT 'external';
  END IF;
END $$;
