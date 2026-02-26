/*
  # Fix infinite recursion in sessions/session_collaborators RLS policies

  ## Problem
  The sessions SELECT policy "Collaborators can view shared sessions" queries session_collaborators.
  The session_collaborators SELECT policy "Session owner or invitee can view collaborators" queries sessions.
  This creates an infinite recursion loop.

  ## Fix
  1. Drop the recursive session_collaborators SELECT policy
  2. Replace it with a non-recursive version that only checks auth.uid() directly against columns
  3. This breaks the cycle: sessions → session_collaborators is fine as long as session_collaborators does NOT query back into sessions for SELECT
*/

DROP POLICY IF EXISTS "Session owner or invitee can view collaborators" ON session_collaborators;

CREATE POLICY "Session owner or invitee can view collaborators"
  ON session_collaborators
  FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid()
    OR invitee_user_id = auth.uid()
  );
