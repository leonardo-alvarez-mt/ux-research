/*
  # Add Public Share Token Read Policies

  ## Summary
  Adds a server-side function that the frontend calls to fetch session data
  using a share token. Since Supabase RLS cannot directly receive URL parameters,
  we create a SECURITY DEFINER RPC function that fetches all session data
  (session, tasks, participants, task attachments) when given a valid active token.
  This avoids the need for anon policies on core tables.

  ## New Functions

  ### `get_shared_session_data(p_token uuid)`
  Returns a JSON object containing the full session data for a given active share token.
  Returns NULL if token is invalid or inactive.
  Callable by anon (unauthenticated users).
*/

CREATE OR REPLACE FUNCTION get_shared_session_data(p_token uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
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

GRANT EXECUTE ON FUNCTION get_shared_session_data(uuid) TO anon, authenticated;
