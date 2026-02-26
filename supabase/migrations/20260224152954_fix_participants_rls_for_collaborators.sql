
/*
  # Fix participants table RLS for collaborators

  ## Problem
  When a collaborator opens the Participants tab in a shared session, the query
  fetches session_participants joined with participants(*). While session_participants
  has a correct policy allowing collaborators to read rows, the participants table
  SELECT policy only allows access where user_id = auth.uid() (i.e., the record
  owner). This means collaborators cannot read participant records owned by the
  session owner, causing the join to fail with a permissions error.

  This unhandled error crashed the component and caused an apparent logout.

  ## Changes

  ### participants table — new SELECT policy for collaborators
  - Adds a second SELECT policy that allows a user to read a participant record
    if that participant appears in session_participants for a session where the
    user is a collaborator (checked via the existing is_session_collaborator()
    security-definer function to avoid recursion).
  - The existing "Users can view own participants" policy (owner access) is kept
    unchanged. PostgreSQL evaluates permissive policies with OR, so either policy
    granting access is sufficient.

  ## Security
  - Uses the existing is_session_collaborator() SECURITY DEFINER function to
    safely check collaborator membership without recursive RLS lookups.
  - Collaborators can only read participants that are explicitly linked to a
    session they have been invited to — no broad access is granted.
*/

CREATE POLICY "Collaborators can view participants in shared sessions"
  ON public.participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.session_participants sp
      WHERE sp.participant_id = id
        AND public.is_session_collaborator(sp.session_id, (select auth.uid()))
    )
  );
