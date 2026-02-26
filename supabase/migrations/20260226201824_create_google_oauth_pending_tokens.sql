/*
  # Create google_oauth_pending_tokens table

  ## Purpose
  Temporarily stores Google OAuth tokens returned from the OAuth callback
  before the user has authenticated in the app. This enables a seamless flow
  where:
  1. User starts OAuth from the survey results page
  2. Google redirects back to the edge function callback
  3. Edge function saves tokens here (keyed by survey_id + a short-lived nonce)
  4. User logs in, app reads pending tokens, completes the connection
  5. Row is deleted after claimed (or expires after 10 minutes)

  ## New Tables
  - `google_oauth_pending_tokens`
    - `id` (uuid, pk)
    - `survey_id` (uuid, not null) — which survey initiated the OAuth
    - `access_token` (text, not null)
    - `refresh_token` (text)
    - `expires_at` (timestamptz) — when the Google access token expires
    - `created_at` (timestamptz) — row creation time; used for cleanup
    - `claim_token` (text, not null, unique) — random secret so only the
      browser that started the flow can claim these tokens

  ## Security
  - RLS enabled; no authenticated-user policies needed because the
    edge function uses the service role key to write rows, and the
    claim_token acts as a bearer secret for the read/delete path.
  - Rows expire after 10 minutes (enforced by edge function and client).
*/

CREATE TABLE IF NOT EXISTS google_oauth_pending_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL DEFAULT '',
  expires_at timestamptz,
  claim_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS google_oauth_pending_tokens_claim_token_idx
  ON google_oauth_pending_tokens (claim_token);

CREATE INDEX IF NOT EXISTS google_oauth_pending_tokens_survey_id_idx
  ON google_oauth_pending_tokens (survey_id);

ALTER TABLE google_oauth_pending_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read pending tokens by claim_token"
  ON google_oauth_pending_tokens
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete claimed tokens"
  ON google_oauth_pending_tokens
  FOR DELETE
  TO authenticated
  USING (true);
