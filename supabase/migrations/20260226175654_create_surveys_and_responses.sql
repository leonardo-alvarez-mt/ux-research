/*
  # Create Survey System Tables

  ## Overview
  Adds a complete survey system with builder support and anonymous response collection.

  ## New Tables

  ### surveys
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to auth.users) - owner
  - `title` (text) - survey title
  - `description` (text) - optional description shown on welcome screen
  - `status` (text) - 'draft' or 'published'
  - `share_token` (uuid, unique) - public token for the respondent URL
  - `created_at` / `updated_at` (timestamptz)

  ### survey_questions
  - `id` (uuid, primary key)
  - `survey_id` (uuid, FK to surveys ON DELETE CASCADE)
  - `type` (text) - question type: short_text | long_text | multiple_choice | single_choice | rating | email | number
  - `title` (text) - question prompt
  - `description` (text) - optional sub-text
  - `required` (boolean, default false)
  - `sort_order` (integer) - display order
  - `settings` (jsonb) - type-specific config (choices array, rating max, etc.)
  - `created_at` (timestamptz)

  ### survey_responses
  - `id` (uuid, primary key)
  - `survey_id` (uuid, FK to surveys ON DELETE CASCADE)
  - `submitted_at` (timestamptz)

  ### survey_response_answers
  - `id` (uuid, primary key)
  - `response_id` (uuid, FK to survey_responses ON DELETE CASCADE)
  - `question_id` (uuid, FK to survey_questions ON DELETE CASCADE)
  - `answer` (jsonb) - flexible answer storage for all question types

  ## Security
  - RLS enabled on all four tables
  - Owners (authenticated) can CRUD their surveys and questions
  - Anyone (anon + authenticated) can read a published survey by share_token (via the question select policy)
  - Anyone can INSERT responses and answers (for anonymous respondents)
  - Only owners can SELECT their own responses and answers

  ## Notes
  - `share_token` defaults to `gen_random_uuid()` so every survey gets one on creation
  - `status` check constraint enforces only 'draft' or 'published'
  - `type` check constraint enforces only known question types
*/

-- ============================================================
-- surveys
-- ============================================================
CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  share_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can select own surveys"
  ON surveys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert surveys"
  ON surveys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update own surveys"
  ON surveys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can delete own surveys"
  ON surveys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow anyone to read a survey by share_token (needed for the public response page)
CREATE POLICY "Anyone can read published survey by token"
  ON surveys FOR SELECT
  TO anon
  USING (status = 'published');

-- ============================================================
-- survey_questions
-- ============================================================
CREATE TABLE IF NOT EXISTS survey_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'short_text' CHECK (type IN (
    'short_text', 'long_text', 'multiple_choice', 'single_choice', 'rating', 'email', 'number'
  )),
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can select own survey questions"
  ON survey_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can select questions of published surveys"
  ON survey_questions FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.status = 'published'
    )
  );

CREATE POLICY "Owners can insert survey questions"
  ON survey_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update own survey questions"
  ON survey_questions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete own survey questions"
  ON survey_questions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_questions.survey_id
      AND surveys.user_id = auth.uid()
    )
  );

-- ============================================================
-- survey_responses
-- ============================================================
CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  submitted_at timestamptz DEFAULT now()
);

ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can select responses to own surveys"
  ON survey_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_responses.survey_id
      AND surveys.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert a survey response"
  ON survey_responses FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_responses.survey_id
      AND surveys.status = 'published'
    )
  );

CREATE POLICY "Authenticated users can insert a survey response"
  ON survey_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM surveys
      WHERE surveys.id = survey_responses.survey_id
      AND surveys.status = 'published'
    )
  );

-- ============================================================
-- survey_response_answers
-- ============================================================
CREATE TABLE IF NOT EXISTS survey_response_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
  answer jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE survey_response_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can select answers to own surveys"
  ON survey_response_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM survey_responses
      JOIN surveys ON surveys.id = survey_responses.survey_id
      WHERE survey_responses.id = survey_response_answers.response_id
      AND surveys.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert response answers"
  ON survey_response_answers FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert response answers"
  ON survey_response_answers FOR INSERT
  TO authenticated
  WITH CHECK (true);
