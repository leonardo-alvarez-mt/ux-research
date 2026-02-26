
/*
  # Fix Security Issues

  ## Summary
  Addresses all reported security and performance issues:

  1. **Unindexed Foreign Keys** — Add covering indexes for:
     - master_template_attachments.template_task_id
     - session_collaborators.invited_by
     - session_shares.created_by

  2. **RLS Auth Initialization Plan** — Replace bare `auth.uid()` calls with
     `(select auth.uid())` in all policies across profiles, sessions, tasks,
     participants, session_participants, task_attachments, session_shares,
     and session_collaborators tables.

  3. **Drop Unused Indexes** — Remove indexes that have never been used:
     - idx_session_participants_participant_id
     - idx_session_shares_token
     - idx_session_shares_session_id
     - idx_session_collaborators_session_id
     - idx_session_collaborators_invitee_user_id
     - idx_session_collaborators_invitee_email

  4. **Consolidate Multiple Permissive Policies** — Merge duplicate SELECT/INSERT/UPDATE
     policies into single unified policies per action for:
     - session_participants (SELECT, INSERT, UPDATE)
     - sessions (SELECT)
     - task_attachments (SELECT)
     - tasks (SELECT, UPDATE)

  5. **Fix Mutable Search Path** — Add `SET search_path = public` to all 3
     security-definer functions.
*/

-- ============================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_master_template_attachments_template_task_id
  ON public.master_template_attachments (template_task_id);

CREATE INDEX IF NOT EXISTS idx_session_collaborators_invited_by
  ON public.session_collaborators (invited_by);

CREATE INDEX IF NOT EXISTS idx_session_shares_created_by
  ON public.session_shares (created_by);

-- ============================================================
-- 2. DROP UNUSED INDEXES
-- ============================================================

DROP INDEX IF EXISTS public.idx_session_participants_participant_id;
DROP INDEX IF EXISTS public.idx_session_shares_token;
DROP INDEX IF EXISTS public.idx_session_shares_session_id;
DROP INDEX IF EXISTS public.idx_session_collaborators_session_id;
DROP INDEX IF EXISTS public.idx_session_collaborators_invitee_user_id;
DROP INDEX IF EXISTS public.idx_session_collaborators_invitee_email;

-- ============================================================
-- 3. FIX RLS POLICIES — profiles
-- ============================================================

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

-- ============================================================
-- 4. FIX RLS POLICIES — sessions (also consolidate SELECT)
-- ============================================================

DROP POLICY IF EXISTS "Users can view own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Collaborators can view shared sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.sessions;

CREATE POLICY "Users can view own and shared sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.session_collaborators sc
      WHERE sc.session_id = id
        AND sc.invitee_user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- 5. FIX RLS POLICIES — tasks (also consolidate SELECT, UPDATE)
-- ============================================================

DROP POLICY IF EXISTS "Users can view tasks of own sessions" ON public.tasks;
DROP POLICY IF EXISTS "Collaborators can view tasks of shared sessions" ON public.tasks;
DROP POLICY IF EXISTS "Users can insert tasks for own sessions" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks of own sessions" ON public.tasks;
DROP POLICY IF EXISTS "Editor collaborators can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete tasks of own sessions" ON public.tasks;

CREATE POLICY "Users can view tasks of own and shared sessions"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.session_collaborators sc
            WHERE sc.session_id = s.id
              AND sc.invitee_user_id = (select auth.uid())
          )
        )
    )
  );

CREATE POLICY "Users can insert tasks for own sessions"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update tasks of own and shared sessions"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.session_collaborators sc
            WHERE sc.session_id = s.id
              AND sc.invitee_user_id = (select auth.uid())
              AND sc.role = 'editor'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.session_collaborators sc
            WHERE sc.session_id = s.id
              AND sc.invitee_user_id = (select auth.uid())
              AND sc.role = 'editor'
          )
        )
    )
  );

CREATE POLICY "Users can delete tasks of own sessions"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 6. FIX RLS POLICIES — participants
-- ============================================================

DROP POLICY IF EXISTS "Users can view own participants" ON public.participants;
DROP POLICY IF EXISTS "Users can insert own participants" ON public.participants;
DROP POLICY IF EXISTS "Users can update own participants" ON public.participants;
DROP POLICY IF EXISTS "Users can delete own participants" ON public.participants;

CREATE POLICY "Users can view own participants"
  ON public.participants FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own participants"
  ON public.participants FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own participants"
  ON public.participants FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own participants"
  ON public.participants FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- 7. FIX RLS POLICIES — session_participants (also consolidate)
-- ============================================================

DROP POLICY IF EXISTS "Users can view session_participants for own sessions" ON public.session_participants;
DROP POLICY IF EXISTS "Collaborators can view session participants" ON public.session_participants;
DROP POLICY IF EXISTS "Users can insert session_participants for own sessions" ON public.session_participants;
DROP POLICY IF EXISTS "Editor collaborators can insert session participants" ON public.session_participants;
DROP POLICY IF EXISTS "Users can update session_participants for own sessions" ON public.session_participants;
DROP POLICY IF EXISTS "Editor collaborators can update session participants" ON public.session_participants;
DROP POLICY IF EXISTS "Users can delete session_participants for own sessions" ON public.session_participants;

CREATE POLICY "Users can view session_participants for own and shared sessions"
  ON public.session_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.session_collaborators sc
            WHERE sc.session_id = s.id
              AND sc.invitee_user_id = (select auth.uid())
          )
        )
    )
  );

CREATE POLICY "Users can insert session_participants for own and shared sessions"
  ON public.session_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.session_collaborators sc
            WHERE sc.session_id = s.id
              AND sc.invitee_user_id = (select auth.uid())
              AND sc.role = 'editor'
          )
        )
    )
  );

CREATE POLICY "Users can update session_participants for own and shared sessions"
  ON public.session_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.session_collaborators sc
            WHERE sc.session_id = s.id
              AND sc.invitee_user_id = (select auth.uid())
              AND sc.role = 'editor'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.session_collaborators sc
            WHERE sc.session_id = s.id
              AND sc.invitee_user_id = (select auth.uid())
              AND sc.role = 'editor'
          )
        )
    )
  );

CREATE POLICY "Users can delete session_participants for own sessions"
  ON public.session_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 8. FIX RLS POLICIES — task_attachments (also consolidate SELECT)
-- ============================================================

DROP POLICY IF EXISTS "Users can view attachments for own session tasks" ON public.task_attachments;
DROP POLICY IF EXISTS "Collaborators can view task attachments" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can insert attachments for own session tasks" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can update attachments for own session tasks" ON public.task_attachments;
DROP POLICY IF EXISTS "Users can delete attachments for own session tasks" ON public.task_attachments;

CREATE POLICY "Users can view attachments for own and shared session tasks"
  ON public.task_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.sessions s ON s.id = t.session_id
      WHERE t.id = task_id
        AND (
          s.user_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.session_collaborators sc
            WHERE sc.session_id = s.id
              AND sc.invitee_user_id = (select auth.uid())
          )
        )
    )
  );

CREATE POLICY "Users can insert attachments for own session tasks"
  ON public.task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.sessions s ON s.id = t.session_id
      WHERE t.id = task_id AND s.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update attachments for own session tasks"
  ON public.task_attachments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.sessions s ON s.id = t.session_id
      WHERE t.id = task_id AND s.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.sessions s ON s.id = t.session_id
      WHERE t.id = task_id AND s.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete attachments for own session tasks"
  ON public.task_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.sessions s ON s.id = t.session_id
      WHERE t.id = task_id AND s.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 9. FIX RLS POLICIES — session_shares
-- ============================================================

DROP POLICY IF EXISTS "Session owner can view their share tokens" ON public.session_shares;
DROP POLICY IF EXISTS "Session owner can insert share tokens" ON public.session_shares;
DROP POLICY IF EXISTS "Session owner can update share tokens" ON public.session_shares;
DROP POLICY IF EXISTS "Session owner can delete share tokens" ON public.session_shares;

CREATE POLICY "Session owner can view their share tokens"
  ON public.session_shares FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = created_by
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Session owner can insert share tokens"
  ON public.session_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Session owner can update share tokens"
  ON public.session_shares FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Session owner can delete share tokens"
  ON public.session_shares FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 10. FIX RLS POLICIES — session_collaborators
-- ============================================================

DROP POLICY IF EXISTS "Session owner or invitee can view collaborators" ON public.session_collaborators;
DROP POLICY IF EXISTS "Session owner can insert collaborators" ON public.session_collaborators;
DROP POLICY IF EXISTS "Session owner can update collaborators" ON public.session_collaborators;
DROP POLICY IF EXISTS "Session owner can delete collaborators" ON public.session_collaborators;

CREATE POLICY "Session owner or invitee can view collaborators"
  ON public.session_collaborators FOR SELECT
  TO authenticated
  USING (
    invitee_user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Session owner can insert collaborators"
  ON public.session_collaborators FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Session owner can update collaborators"
  ON public.session_collaborators FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Session owner can delete collaborators"
  ON public.session_collaborators FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id AND s.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 11. FIX MUTABLE SEARCH PATH ON FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_session_id_from_token(p_token uuid)
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
SELECT session_id
FROM session_shares
WHERE token = p_token
AND is_active = true
LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.resolve_collaborator_user_id()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
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

CREATE OR REPLACE FUNCTION public.get_shared_session_data(p_token uuid)
  RETURNS json
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_result json;
BEGIN
  SELECT session_id INTO v_session_id
  FROM session_shares
  WHERE token = p_token
  AND is_active = true
  LIMIT 1;

  IF v_session_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'session', row_to_json(s),
    'tasks', (
      SELECT json_agg(t ORDER BY t.due_date, t.sort_order)
      FROM tasks t
      WHERE t.session_id = v_session_id
    ),
    'participants', (
      SELECT json_agg(
        json_build_object(
          'id', sp.id,
          'session_id', sp.session_id,
          'participant_id', sp.participant_id,
          'slot', sp.slot,
          'status', sp.status,
          'created_at', sp.created_at,
          'participant', row_to_json(p)
        )
        ORDER BY sp.created_at
      )
      FROM session_participants sp
      JOIN participants p ON p.id = sp.participant_id
      WHERE sp.session_id = v_session_id
    ),
    'task_attachments', (
      SELECT json_agg(ta ORDER BY ta.created_at)
      FROM task_attachments ta
      JOIN tasks t2 ON t2.id = ta.task_id
      WHERE t2.session_id = v_session_id
    ),
    'owner_profile', (
      SELECT row_to_json(pr)
      FROM profiles pr
      JOIN sessions ses ON ses.user_id = pr.id
      WHERE ses.id = v_session_id
      LIMIT 1
    )
  ) INTO v_result
  FROM sessions s
  WHERE s.id = v_session_id;

  RETURN v_result;
END;
$$;
