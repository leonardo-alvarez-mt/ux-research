/*
  # Fix Security Issues: Indexes, RLS Policies, and Unused Indexes

  ## Overview
  Addresses all flagged security and performance issues:

  ## 1. Missing Indexes on Foreign Keys
  Creates covering indexes for all unindexed foreign keys to improve JOIN and lookup performance:
  - session_collaborators.invitee_user_id
  - session_participants.participant_id
  - session_shares.session_id
  - survey_questions.survey_id
  - survey_response_answers.question_id
  - survey_response_answers.response_id
  - survey_responses.survey_id
  - surveys.user_id

  ## 2. RLS Policy Performance Fix (Auth Initialization Plan)
  Replaces `auth.uid()` with `(select auth.uid())` in all affected policies on:
  - surveys (4 policies)
  - survey_questions (4 policies)
  - survey_responses (1 policy)
  - survey_response_answers (1 policy)
  This prevents per-row re-evaluation of the auth function.

  ## 3. Fix survey_response_answers INSERT Policies (Always True)
  Replaces unrestricted `WITH CHECK (true)` INSERT policies with proper checks
  that verify the related response belongs to a published survey.

  ## 4. Drop Unused Indexes
  Removes indexes that have never been used:
  - idx_master_template_attachments_template_task_id
  - idx_session_collaborators_invited_by
  - idx_session_shares_created_by

  ## 5. Fix participants Multiple Permissive SELECT Policies
  Merges the two overlapping SELECT policies for authenticated users on participants
  into a single unified policy.
*/

-- ============================================================
-- 1. Add missing indexes for foreign keys
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_session_collaborators_invitee_user_id
  ON public.session_collaborators (invitee_user_id);

CREATE INDEX IF NOT EXISTS idx_session_participants_participant_id
  ON public.session_participants (participant_id);

CREATE INDEX IF NOT EXISTS idx_session_shares_session_id
  ON public.session_shares (session_id);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_id
  ON public.survey_questions (survey_id);

CREATE INDEX IF NOT EXISTS idx_survey_response_answers_question_id
  ON public.survey_response_answers (question_id);

CREATE INDEX IF NOT EXISTS idx_survey_response_answers_response_id
  ON public.survey_response_answers (response_id);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id
  ON public.survey_responses (survey_id);

CREATE INDEX IF NOT EXISTS idx_surveys_user_id
  ON public.surveys (user_id);

-- ============================================================
-- 2. Fix RLS policies on surveys to use (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Owners can select own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Owners can insert surveys" ON public.surveys;
DROP POLICY IF EXISTS "Owners can update own surveys" ON public.surveys;
DROP POLICY IF EXISTS "Owners can delete own surveys" ON public.surveys;

CREATE POLICY "Owners can select own surveys"
  ON public.surveys FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Owners can insert surveys"
  ON public.surveys FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Owners can update own surveys"
  ON public.surveys FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Owners can delete own surveys"
  ON public.surveys FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- 3. Fix RLS policies on survey_questions to use (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Owners can select own survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Owners can insert survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Owners can update own survey questions" ON public.survey_questions;
DROP POLICY IF EXISTS "Owners can delete own survey questions" ON public.survey_questions;

CREATE POLICY "Owners can select own survey questions"
  ON public.survey_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Owners can insert survey questions"
  ON public.survey_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Owners can update own survey questions"
  ON public.survey_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Owners can delete own survey questions"
  ON public.survey_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 4. Fix RLS policy on survey_responses to use (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "Owners can select responses to own surveys" ON public.survey_responses;

CREATE POLICY "Owners can select responses to own surveys"
  ON public.survey_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_responses.survey_id
      AND surveys.user_id = (select auth.uid())
    )
  );

-- ============================================================
-- 5. Fix RLS policy on survey_response_answers to use (select auth.uid())
--    and fix the always-true INSERT policies
-- ============================================================
DROP POLICY IF EXISTS "Owners can select answers to own surveys" ON public.survey_response_answers;
DROP POLICY IF EXISTS "Anyone can insert response answers" ON public.survey_response_answers;
DROP POLICY IF EXISTS "Authenticated users can insert response answers" ON public.survey_response_answers;

CREATE POLICY "Owners can select answers to own surveys"
  ON public.survey_response_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_responses
      JOIN surveys ON surveys.id = survey_responses.survey_id
      WHERE survey_responses.id = survey_response_answers.response_id
      AND surveys.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Anyone can insert response answers"
  ON public.survey_response_answers FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_responses
      JOIN surveys ON surveys.id = survey_responses.survey_id
      WHERE survey_responses.id = survey_response_answers.response_id
      AND surveys.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can insert response answers"
  ON public.survey_response_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM survey_responses
      JOIN surveys ON surveys.id = survey_responses.survey_id
      WHERE survey_responses.id = survey_response_answers.response_id
      AND surveys.status = 'published'
    )
  );

-- ============================================================
-- 6. Drop unused indexes
-- ============================================================
DROP INDEX IF EXISTS public.idx_master_template_attachments_template_task_id;
DROP INDEX IF EXISTS public.idx_session_collaborators_invited_by;
DROP INDEX IF EXISTS public.idx_session_shares_created_by;

-- ============================================================
-- 7. Fix participants multiple permissive SELECT policies
--    Merge into a single policy that covers both own participants
--    and participants in sessions where user is a collaborator
-- ============================================================
DROP POLICY IF EXISTS "Users can view own participants" ON public.participants;
DROP POLICY IF EXISTS "Collaborators can view participants in shared sessions" ON public.participants;

CREATE POLICY "Users can view accessible participants"
  ON public.participants FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM session_participants sp
      JOIN sessions s ON s.id = sp.session_id
      LEFT JOIN session_collaborators sc ON sc.session_id = s.id
      WHERE sp.participant_id = participants.id
      AND (
        s.user_id = (select auth.uid())
        OR sc.invitee_user_id = (select auth.uid())
      )
    )
  );
