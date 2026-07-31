/*
# Make internal participants visible to all authenticated users

## Purpose
Internal participants (participant_scope = 'internal') are shared company
team members, not per-user customer contacts. They should be visible to
every logged-in user so the internal roster is consistent across the team.

## Changes
1. Security (RLS) — participants table
   - Drops and recreates the SELECT policy "Users can view accessible participants".
   - New predicate: a participant row is readable if ANY of:
     a. the requester owns it (user_id = auth.uid())
     b. it is an internal participant (participant_scope = 'internal')
     c. it is linked to a session the requester owns or collaborates on
   - INSERT / UPDATE / DELETE policies are unchanged — only the original
     owner can modify or delete a participant row, even if it is internal.
   - This means internal participants are shared/read-only to non-owners.
*/

DROP POLICY IF EXISTS "Users can view accessible participants" ON participants;

CREATE POLICY "Users can view accessible participants"
ON participants FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid())
  OR (participant_scope = 'internal')
  OR EXISTS (
    SELECT 1 FROM session_participants sp
    JOIN sessions s ON s.id = sp.session_id
    LEFT JOIN session_collaborators sc ON sc.session_id = s.id
    WHERE sp.participant_id = participants.id
      AND (s.user_id = auth.uid() OR sc.invitee_user_id = auth.uid())
  )
);