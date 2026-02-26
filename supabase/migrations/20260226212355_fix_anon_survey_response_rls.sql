/*
  # Fix anonymous survey response submission (401 error)

  ## Problem
  Anonymous users get a 401 error when submitting answers because the INSERT
  policy on `survey_response_answers` contains a WITH CHECK subquery that JOINs
  `survey_responses`. PostgreSQL enforces RLS recursively inside policy
  subqueries — since anon has no SELECT policy on `survey_responses`, the
  subquery returns zero rows, the check always fails, and the INSERT is blocked.

  ## Changes

  ### New Policies
  - `survey_responses`: Add anon SELECT policy scoped only to responses belonging
    to published surveys. This exposes no personal data (the table only contains
    id, survey_id, submitted_at) and is required so that the subquery inside the
    `survey_response_answers` INSERT policy can resolve correctly for anon users.

  ## Notes
  - This is the minimal change required to unblock anonymous survey submissions.
  - The anon SELECT is intentionally narrow: only rows whose survey is published.
  - Once answers are saved correctly, the Google Sheets sync will also populate
    with real answer data.
*/

CREATE POLICY "Anon can read responses of published surveys"
  ON survey_responses FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_responses.survey_id
        AND surveys.status = 'published'
    )
  );
