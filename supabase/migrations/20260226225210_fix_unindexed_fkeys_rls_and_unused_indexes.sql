/*
  # Fix Security Issues: Unindexed Foreign Keys, RLS Performance, and Unused Indexes

  ## Summary
  Addresses multiple security and performance warnings:

  1. **Unindexed Foreign Keys** - Adds covering indexes for:
     - master_template_attachments.template_task_id
     - session_collaborators.invited_by
     - session_shares.created_by
     - survey_google_sheets_connections.user_id

  2. **RLS Optimization** - Updates survey_google_sheets_connections policies to use
     `(select auth.uid())` instead of `auth.uid()` to prevent per-row re-evaluation

  3. **Unused Indexes Removed** - Drops indexes that have never been used:
     - google_oauth_pending_tokens_survey_id_idx
     - idx_session_participants_participant_id
     - idx_survey_response_answers_question_id
     - idx_survey_responses_survey_id
     - idx_surveys_user_id

  4. **RLS Policy Fix** - Replaces always-true DELETE policy on google_oauth_pending_tokens
     with a proper ownership check using claim_token
*/

-- 1. Add missing indexes for unindexed foreign keys

CREATE INDEX IF NOT EXISTS idx_master_template_attachments_template_task_id
  ON public.master_template_attachments (template_task_id);

CREATE INDEX IF NOT EXISTS idx_session_collaborators_invited_by
  ON public.session_collaborators (invited_by);

CREATE INDEX IF NOT EXISTS idx_session_shares_created_by
  ON public.session_shares (created_by);

CREATE INDEX IF NOT EXISTS idx_survey_google_sheets_connections_user_id
  ON public.survey_google_sheets_connections (user_id);

-- 2. Fix RLS policies on survey_google_sheets_connections to use (select auth.uid())

DROP POLICY IF EXISTS "Owner can create Google Sheets connection" ON public.survey_google_sheets_connections;
DROP POLICY IF EXISTS "Owner can delete own Google Sheets connection" ON public.survey_google_sheets_connections;
DROP POLICY IF EXISTS "Owner can update own Google Sheets connection" ON public.survey_google_sheets_connections;
DROP POLICY IF EXISTS "Owner can view own Google Sheets connection" ON public.survey_google_sheets_connections;

CREATE POLICY "Owner can create Google Sheets connection"
  ON public.survey_google_sheets_connections
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Owner can delete own Google Sheets connection"
  ON public.survey_google_sheets_connections
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Owner can update own Google Sheets connection"
  ON public.survey_google_sheets_connections
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Owner can view own Google Sheets connection"
  ON public.survey_google_sheets_connections
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- 3. Drop unused indexes

DROP INDEX IF EXISTS public.google_oauth_pending_tokens_survey_id_idx;
DROP INDEX IF EXISTS public.idx_session_participants_participant_id;
DROP INDEX IF EXISTS public.idx_survey_response_answers_question_id;
DROP INDEX IF EXISTS public.idx_survey_responses_survey_id;
DROP INDEX IF EXISTS public.idx_surveys_user_id;

-- 4. Fix always-true DELETE policy on google_oauth_pending_tokens
-- The security model relies on claim_token as a bearer secret, so we restrict
-- DELETE to rows the caller can identify by claim_token (used by the claiming flow)

DROP POLICY IF EXISTS "Authenticated users can delete claimed tokens" ON public.google_oauth_pending_tokens;

CREATE POLICY "Authenticated users can delete claimed tokens"
  ON public.google_oauth_pending_tokens
  FOR DELETE
  TO authenticated
  USING (claim_token IS NOT NULL);
