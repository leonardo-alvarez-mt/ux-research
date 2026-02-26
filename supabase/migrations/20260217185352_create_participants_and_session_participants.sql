/*
  # Participants & Session Participants Tables

  ## Summary
  Adds participant management to the platform. Participants are global records
  owned by the creating user (a reusable roster), and session_participants is the
  join table linking participants to specific usability sessions.

  ## New Tables

  ### participants
  - `id` (uuid, PK) - unique participant identifier
  - `user_id` (uuid) - the Mitratech team member who created this participant record
  - `name` (text) - participant full name
  - `email` (text) - participant email address
  - `client` (text) - client or organization name
  - `account_manager` (text) - associated account manager name
  - `notes` (text) - any additional notes
  - `created_at` (timestamptz)

  ### session_participants
  - `id` (uuid, PK)
  - `session_id` (uuid) - references sessions
  - `participant_id` (uuid) - references participants
  - `slot` (text) - optional time slot label (e.g., "10:00 AM")
  - `status` (text) - 'invited' | 'confirmed' | 'completed' | 'no-show'
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Users can only manage their own participants
  - Users can only manage session_participants for sessions they own
*/

-- ============================================================
-- PARTICIPANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL DEFAULT '',
  client text NOT NULL DEFAULT '',
  account_manager text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own participants"
  ON participants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own participants"
  ON participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participants"
  ON participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own participants"
  ON participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- SESSION_PARTICIPANTS (join table)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  slot text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'invited',
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_id, participant_id)
);

ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view session_participants for own sessions"
  ON session_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_participants.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert session_participants for own sessions"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_participants.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update session_participants for own sessions"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_participants.session_id
      AND sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_participants.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete session_participants for own sessions"
  ON session_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_participants.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_participants_user_id ON participants(user_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_participant_id ON session_participants(participant_id);
