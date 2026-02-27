/*
  # Create CWG Session Metadata Table

  ## Summary
  Adds a metadata table for Client Working Group sessions to store CWG-specific
  information that doesn't belong on the generic sessions table. This is a one-to-one
  extension of the sessions table for sessions where session_type = 'client_working_group'.

  ## New Tables

  ### cwg_session_meta
  - `id` (uuid, primary key)
  - `session_id` (uuid, unique FK to sessions) - one-to-one relationship
  - `meeting_link` (text, nullable) - Zoom/Teams URL for the CWG call
  - `timezone` (text, nullable) - time zone for the meeting
  - `recording_link` (text, nullable) - link to meeting recording post-session
  - `recording_passcode` (text, nullable) - passcode for accessing the recording
  - `recap_sent_at` (timestamptz, nullable) - timestamp when recap email was sent
  - `followup_sent_at` (timestamptz, nullable) - timestamp when 1-week follow-up was sent
  - `created_at` (timestamptz) - record creation time

  ## Security
  - RLS enabled
  - Authenticated session owners can read, insert, update their own CWG meta
  - Session collaborators (editors and viewers) can read CWG meta
  - No public access
*/

CREATE TABLE IF NOT EXISTS cwg_session_meta (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
  meeting_link        text,
  timezone            text,
  recording_link      text,
  recording_passcode  text,
  recap_sent_at       timestamptz,
  followup_sent_at    timestamptz,
  created_at          timestamptz DEFAULT now()
);

ALTER TABLE cwg_session_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session owner can read own CWG meta"
  ON cwg_session_meta FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = cwg_session_meta.session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owner can insert CWG meta"
  ON cwg_session_meta FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = cwg_session_meta.session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owner can update CWG meta"
  ON cwg_session_meta FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = cwg_session_meta.session_id
        AND sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = cwg_session_meta.session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can read CWG meta"
  ON cwg_session_meta FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM session_collaborators
      WHERE session_collaborators.session_id = cwg_session_meta.session_id
        AND session_collaborators.invitee_user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_cwg_session_meta_session_id ON cwg_session_meta(session_id);
