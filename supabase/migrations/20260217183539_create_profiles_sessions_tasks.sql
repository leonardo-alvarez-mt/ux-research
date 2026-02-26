/*
  # Master Usability Governance Checklist - Core Schema

  ## Summary
  Creates the foundational tables for the Mitratech Usability Governance SaaS platform.

  ## New Tables

  ### profiles
  - `id` (uuid, PK) - references auth.users
  - `email` (text) - user's email address
  - `full_name` (text) - user's display name
  - `created_at` (timestamptz) - record creation timestamp

  ### sessions
  - `id` (uuid, PK) - unique session identifier
  - `user_id` (uuid) - references auth.users
  - `name` (text) - session name
  - `test_date` (date) - the usability test date
  - `description` (text) - optional session description
  - `is_archived` (boolean) - soft delete / archive flag
  - `created_at` (timestamptz) - record creation timestamp

  ### tasks
  - `id` (uuid, PK) - unique task identifier
  - `session_id` (uuid) - references sessions
  - `title` (text) - task title
  - `phase` (text) - time-based phase label
  - `due_date` (date) - calculated from test_date + offset
  - `is_completed` (boolean) - completion status
  - `category` (text) - task category
  - `sort_order` (integer) - ordering within phase
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own profiles, sessions, and tasks
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  test_date date NOT NULL,
  description text DEFAULT '',
  is_archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title text NOT NULL,
  phase text NOT NULL,
  due_date date NOT NULL,
  is_completed boolean DEFAULT false,
  category text NOT NULL DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks of own sessions"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = tasks.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks for own sessions"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = tasks.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks of own sessions"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = tasks.session_id
      AND sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = tasks.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks of own sessions"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = tasks.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON tasks(session_id);
