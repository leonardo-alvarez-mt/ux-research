/*
  # Create survey_google_sheets_connections table

  ## Summary
  Stores Google Sheets OAuth connections for individual surveys, allowing survey owners
  to automatically sync responses to a Google Spreadsheet.

  ## New Tables

  ### `survey_google_sheets_connections`
  - `id` (uuid, PK) - Unique connection identifier
  - `survey_id` (uuid, FK → surveys) - The survey this connection belongs to
  - `user_id` (uuid, FK → auth.users) - The authenticated owner who connected their Google account
  - `spreadsheet_id` (text) - Google Spreadsheet ID extracted from the URL
  - `spreadsheet_url` (text) - Full Google Spreadsheet URL entered by the user
  - `sheet_name` (text) - Target tab/sheet name within the spreadsheet
  - `google_access_token` (text) - OAuth access token (short-lived)
  - `google_refresh_token` (text) - OAuth refresh token (long-lived, used to renew access token)
  - `token_expires_at` (timestamptz) - When the access token expires
  - `last_synced_at` (timestamptz, nullable) - Timestamp of the last successful sync
  - `created_at` (timestamptz) - When the connection was created

  ## Security
  - RLS enabled on the table
  - Only the owning user can SELECT, INSERT, UPDATE, or DELETE their own connection records
*/

CREATE TABLE IF NOT EXISTS survey_google_sheets_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spreadsheet_id text NOT NULL DEFAULT '',
  spreadsheet_url text NOT NULL DEFAULT '',
  sheet_name text NOT NULL DEFAULT 'Sheet1',
  google_access_token text NOT NULL DEFAULT '',
  google_refresh_token text NOT NULL DEFAULT '',
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE survey_google_sheets_connections ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS survey_google_sheets_connections_survey_id_user_id_idx
  ON survey_google_sheets_connections(survey_id, user_id);

CREATE POLICY "Owner can view own Google Sheets connection"
  ON survey_google_sheets_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can create Google Sheets connection"
  ON survey_google_sheets_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own Google Sheets connection"
  ON survey_google_sheets_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own Google Sheets connection"
  ON survey_google_sheets_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
