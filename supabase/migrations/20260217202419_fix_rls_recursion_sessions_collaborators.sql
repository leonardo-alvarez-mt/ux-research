
/*
  # Fix RLS Recursion Between sessions and session_collaborators

  ## Problem
  The sessions SELECT policy checks session_collaborators, and the
  session_collaborators SELECT policy checks sessions — causing infinite
  recursion and making sessions invisible to users.

  ## Solution
  - Replace the sessions SELECT policy with one that avoids the recursion
    by checking session_collaborators directly without going through the
    sessions RLS again (use a SECURITY DEFINER helper function).
  - The sessions owner check stays simple (user_id = auth.uid()).
  - The collaborator check uses a dedicated function that bypasses RLS.
*/

-- Helper function to check if user is a collaborator, bypasses RLS
CREATE OR REPLACE FUNCTION public.is_session_collaborator(p_session_id uuid, p_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM session_collaborators
    WHERE session_id = p_session_id
      AND invitee_user_id = p_user_id
  );
$$;

-- Fix sessions SELECT policy to avoid recursion
DROP POLICY IF EXISTS "Users can view own and shared sessions" ON public.sessions;

CREATE POLICY "Users can view own and shared sessions"
  ON public.sessions FOR SELECT
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR public.is_session_collaborator(id, (select auth.uid()))
  );

-- Fix tasks SELECT policy to avoid nested recursion through sessions
DROP POLICY IF EXISTS "Users can view tasks of own and shared sessions" ON public.tasks;

CREATE POLICY "Users can view tasks of own and shared sessions"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = (select auth.uid())
          OR public.is_session_collaborator(s.id, (select auth.uid()))
        )
    )
  );

-- Fix tasks UPDATE policy similarly
DROP POLICY IF EXISTS "Users can update tasks of own and shared sessions" ON public.tasks;

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

-- Fix session_participants SELECT policy similarly
DROP POLICY IF EXISTS "Users can view session_participants for own and shared sessions" ON public.session_participants;

CREATE POLICY "Users can view session_participants for own and shared sessions"
  ON public.session_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id = session_id
        AND (
          s.user_id = (select auth.uid())
          OR public.is_session_collaborator(s.id, (select auth.uid()))
        )
    )
  );

-- Fix task_attachments SELECT policy similarly
DROP POLICY IF EXISTS "Users can view attachments for own and shared session tasks" ON public.task_attachments;

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
          OR public.is_session_collaborator(s.id, (select auth.uid()))
        )
    )
  );
