/*
  # Add spreadsheet columns to google_oauth_pending_tokens

  ## Summary
  Adds two optional columns to the `google_oauth_pending_tokens` table to carry
  auto-created spreadsheet information from the OAuth callback edge function back
  to the frontend during the claim step.

  ## Changes
  - `google_oauth_pending_tokens`
    - Added `spreadsheet_id` (text, nullable) — ID of the auto-created Google Spreadsheet
    - Added `spreadsheet_url` (text, nullable) — Full URL of the auto-created Google Spreadsheet

  ## Notes
  - These columns are nullable because auto-creation is best-effort; if it fails the
    user falls back to manual URL entry in the configure step.
  - No RLS changes needed as they inherit existing table policies.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_oauth_pending_tokens' AND column_name = 'spreadsheet_id'
  ) THEN
    ALTER TABLE google_oauth_pending_tokens ADD COLUMN spreadsheet_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'google_oauth_pending_tokens' AND column_name = 'spreadsheet_url'
  ) THEN
    ALTER TABLE google_oauth_pending_tokens ADD COLUMN spreadsheet_url text;
  END IF;
END $$;
