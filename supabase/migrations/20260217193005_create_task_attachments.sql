/*
  # Task Attachments Table

  ## Summary
  Adds file/link attachments to individual tasks. Each attachment belongs to a
  task and can be either an uploaded file (stored in Supabase Storage) or a
  plain URL link. Also adds a master_template_attachments table to seed default
  links that are automatically copied when a new session is created.

  ## New Tables

  ### task_attachments
  - `id` (uuid, PK)
  - `task_id` (uuid) - references tasks
  - `label` (text) - display name for the attachment
  - `type` (text) - 'link' or 'file'
  - `url` (text) - URL for links OR the storage path/public URL for files
  - `file_name` (text) - original file name (for files only)
  - `created_at` (timestamptz)

  ### master_template_attachments
  - `id` (integer, PK)
  - `template_task_id` (integer) - references master_template.id
  - `label` (text) - display name
  - `type` (text) - 'link' or 'file'
  - `url` (text) - default URL
  - `file_name` (text)

  Also adds a "Things a therapist would say" standalone task to Test Day phase
  so it can carry its default attachment.

  ## Security
  - RLS enabled on task_attachments
  - Users can only manage attachments for tasks belonging to their own sessions
  - master_template_attachments is read-only for authenticated users
*/

-- ============================================================
-- TASK ATTACHMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'link',
  url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for own session tasks"
  ON task_attachments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN sessions ON sessions.id = tasks.session_id
      WHERE tasks.id = task_attachments.task_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments for own session tasks"
  ON task_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN sessions ON sessions.id = tasks.session_id
      WHERE tasks.id = task_attachments.task_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update attachments for own session tasks"
  ON task_attachments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN sessions ON sessions.id = tasks.session_id
      WHERE tasks.id = task_attachments.task_id
      AND sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN sessions ON sessions.id = tasks.session_id
      WHERE tasks.id = task_attachments.task_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments for own session tasks"
  ON task_attachments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN sessions ON sessions.id = tasks.session_id
      WHERE tasks.id = task_attachments.task_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);

-- ============================================================
-- MASTER TEMPLATE ATTACHMENTS (default links seeded per task)
-- ============================================================
CREATE TABLE IF NOT EXISTS master_template_attachments (
  id integer PRIMARY KEY,
  template_task_id integer NOT NULL REFERENCES master_template(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'link',
  url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT ''
);

ALTER TABLE master_template_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read master template attachments"
  ON master_template_attachments FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- ADD MISSING TASKS TO MASTER TEMPLATE
-- (needed to carry the "things a therapist would say" attachment
--  and the observer instructions attachment)
-- ============================================================

-- Add "Things a Therapist Would Say" as a Test Day reference item
INSERT INTO master_template (id, title, phase, day_offset, category, sort_order)
VALUES (38, 'Review facilitator reference sheet: Things a Therapist Would Say', 'Test Day', 0, 'Facilitation', 7)
ON CONFLICT (id) DO NOTHING;

-- Add "Observer Instructions" as a 1-2 Days Before item
INSERT INTO master_template (id, title, phase, day_offset, category, sort_order)
VALUES (39, 'Prepare observer handouts: Instructions for Usability Test Observers', '1-2 Days Before', -1, 'Content & Materials', 12)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DEFAULT ATTACHMENTS FOR SPECIFIC TEMPLATE TASKS
-- ============================================================

-- Find existing task IDs for:
-- "Prepare recording consent forms for participants"  → template id 18
-- "Test Script"  → we add to template id 38 (therapist) and id 39 (observer)
-- "Recording consent" → template id 18

INSERT INTO master_template_attachments (id, template_task_id, label, type, url, file_name) VALUES
(1, 39, 'Instructions for Usability Test Observers', 'link', 'https://sensible.com/downloads/instructions-for-observers.pdf', ''),
(2, 38, 'Things a Therapist Would Say', 'link', 'https://sensible.com/downloads/things-a-therapist-would-say.pdf', ''),
(3, 18, 'Recording Consent Form', 'link', 'https://sensible.com/downloads/permission-form.pdf', ''),
(4, 15, 'Test Script Template', 'link', 'https://sensible.com/downloads/test-script-mobile-11-20.pdf', '')
ON CONFLICT (id) DO NOTHING;
