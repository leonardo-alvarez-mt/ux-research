/*
  # Create Session Shares and Collaborators

  ## Summary
  This migration adds two new features: public share links and registered collaborator invites.

  ## New Tables

  ### `session_shares`
  Stores tokenized public share links for sessions.
  - `id` (uuid, primary key)
  - `session_id` (uuid, FK to sessions) - the session being shared
  - `token` (uuid, unique) - the URL-safe token used in the share link
  - `created_by` (uuid, FK to auth.users) - the session owner who created the share
  - `is_active` (boolean) - allows revoking the link without deleting it
  - `created_at` (timestamptz)

  ### `session_collaborators`
  Stores collaborator invitations for registered users.
  - `id` (uuid, primary key)
  - `session_id` (uuid, FK to sessions) - the session they're invited to
  - `invitee_email` (text) - the email address of the invited user
  - `invitee_user_id` (uuid, nullable) - populated when the user is already registered
  - `role` (text) - either 'viewer' or 'editor'
  - `invited_by` (uuid, FK to auth.users) - who sent the invite
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both new tables
  - session_shares: only the session owner can create/read/revoke tokens
  - session_collaborators: session owner can manage; invitee can read their own row
  - Existing sessions/tasks/participants RLS updated to allow collaborator access
*/

-- ============================================================
-- TABLE: session_shares (must come before the helper function)
-- ============================================================
CREATE TABLE IF NOT EXISTS session_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  token       uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE session_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session owner can insert share tokens"
  ON session_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owner can view their share tokens"
  ON session_shares FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Session owner can update share tokens"
  ON session_shares FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Session owner can delete share tokens"
  ON session_shares FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================================
-- HELPER FUNCTION: resolve share token to session_id
-- Now that session_shares exists, we can create this function
-- ============================================================
CREATE OR REPLACE FUNCTION get_session_id_from_token(p_token uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT session_id
  FROM session_shares
  WHERE token = p_token
    AND is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_session_id_from_token(uuid) TO anon, authenticated;

-- ============================================================
-- TABLE: session_collaborators
-- ============================================================
CREATE TABLE IF NOT EXISTS session_collaborators (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  invitee_email   text NOT NULL,
  invitee_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  role            text NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
  invited_by      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, invitee_email)
);

ALTER TABLE session_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session owner can insert collaborators"
  ON session_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owner or invitee can view collaborators"
  ON session_collaborators FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR invitee_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owner can update collaborators"
  ON session_collaborators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_id
        AND sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Session owner can delete collaborators"
  ON session_collaborators FOR DELETE
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_id
        AND sessions.user_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGER: auto-populate invitee_user_id on insert
-- ============================================================
CREATE OR REPLACE FUNCTION resolve_collaborator_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.invitee_user_id IS NULL THEN
    SELECT id INTO NEW.invitee_user_id
    FROM profiles
    WHERE email = NEW.invitee_email
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_resolve_collaborator_user_id
  BEFORE INSERT ON session_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION resolve_collaborator_user_id();

-- ============================================================
-- UPDATE RLS on sessions: allow collaborators to read
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sessions' AND policyname = 'Collaborators can view shared sessions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Collaborators can view shared sessions"
        ON sessions FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM session_collaborators
            WHERE session_collaborators.session_id = sessions.id
              AND session_collaborators.invitee_user_id = auth.uid()
          )
        );
    $policy$;
  END IF;
END $$;

-- ============================================================
-- UPDATE RLS on tasks: allow collaborators to read, editors to write
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks' AND policyname = 'Collaborators can view tasks of shared sessions'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Collaborators can view tasks of shared sessions"
        ON tasks FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM session_collaborators
            WHERE session_collaborators.session_id = tasks.session_id
              AND session_collaborators.invitee_user_id = auth.uid()
          )
        );
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tasks' AND policyname = 'Editor collaborators can update tasks'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Editor collaborators can update tasks"
        ON tasks FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM session_collaborators
            WHERE session_collaborators.session_id = tasks.session_id
              AND session_collaborators.invitee_user_id = auth.uid()
              AND session_collaborators.role = 'editor'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM session_collaborators
            WHERE session_collaborators.session_id = tasks.session_id
              AND session_collaborators.invitee_user_id = auth.uid()
              AND session_collaborators.role = 'editor'
          )
        );
    $policy$;
  END IF;
END $$;

-- ============================================================
-- UPDATE RLS on session_participants: allow collaborator access
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'session_participants' AND policyname = 'Collaborators can view session participants'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Collaborators can view session participants"
        ON session_participants FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM session_collaborators
            WHERE session_collaborators.session_id = session_participants.session_id
              AND session_collaborators.invitee_user_id = auth.uid()
          )
        );
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'session_participants' AND policyname = 'Editor collaborators can insert session participants'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Editor collaborators can insert session participants"
        ON session_participants FOR INSERT
        TO authenticated
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM session_collaborators
            WHERE session_collaborators.session_id = session_participants.session_id
              AND session_collaborators.invitee_user_id = auth.uid()
              AND session_collaborators.role = 'editor'
          )
        );
    $policy$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'session_participants' AND policyname = 'Editor collaborators can update session participants'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Editor collaborators can update session participants"
        ON session_participants FOR UPDATE
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM session_collaborators
            WHERE session_collaborators.session_id = session_participants.session_id
              AND session_collaborators.invitee_user_id = auth.uid()
              AND session_collaborators.role = 'editor'
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM session_collaborators
            WHERE session_collaborators.session_id = session_participants.session_id
              AND session_collaborators.invitee_user_id = auth.uid()
              AND session_collaborators.role = 'editor'
          )
        );
    $policy$;
  END IF;
END $$;

-- ============================================================
-- UPDATE RLS on task_attachments: allow collaborator reads
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'task_attachments' AND policyname = 'Collaborators can view task attachments'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Collaborators can view task attachments"
        ON task_attachments FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM tasks
            JOIN session_collaborators ON session_collaborators.session_id = tasks.session_id
            WHERE tasks.id = task_attachments.task_id
              AND session_collaborators.invitee_user_id = auth.uid()
          )
        );
    $policy$;
  END IF;
END $$;

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_session_shares_token ON session_shares(token);
CREATE INDEX IF NOT EXISTS idx_session_shares_session_id ON session_shares(session_id);
CREATE INDEX IF NOT EXISTS idx_session_collaborators_session_id ON session_collaborators(session_id);
CREATE INDEX IF NOT EXISTS idx_session_collaborators_invitee_user_id ON session_collaborators(invitee_user_id);
CREATE INDEX IF NOT EXISTS idx_session_collaborators_invitee_email ON session_collaborators(invitee_email);
