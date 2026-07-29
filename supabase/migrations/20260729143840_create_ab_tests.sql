/*
# Create A/B Test tables

## Summary
Adds a new "A/B Test" feature: an owner creates a test containing one or more
"batches" (rounds). Each batch has two screenshot options (A and B). Voters who
sign in with a @mitratech.com Google account can vote once per batch and leave
an optional comment. The owner sees results with vote counts, percentages, and
comments per batch.

## New Tables
- `ab_tests` — the test itself (title, description, owner, auto-generated public share token)
- `ab_test_batches` — rounds within a test (prompt, sort order)
- `ab_test_options` — the two screenshot options per batch (label A/B, image URL, caption)
- `ab_test_votes` — one vote per voter per batch (which option they chose, optional comment)

## Security
- Owner-scoped CRUD on ab_tests / batches / options (authenticated, auth.uid() = user_id)
- Any authenticated user can read published tests + batches + options (so voters can see them)
- Any authenticated user can insert their own vote (auth.uid() = voter_id)
- Voters can read/update/delete only their own votes
- Unique constraint on (batch_id, voter_id) enforces one vote per batch per person
- Screenshots stored in the existing public `task-files` storage bucket
*/

-- ============================================================
-- ab_tests
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  share_token text NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_ab_tests" ON ab_tests;
CREATE POLICY "select_own_ab_tests" ON ab_tests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_ab_tests" ON ab_tests;
CREATE POLICY "insert_own_ab_tests" ON ab_tests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_ab_tests" ON ab_tests;
CREATE POLICY "update_own_ab_tests" ON ab_tests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_ab_tests" ON ab_tests;
CREATE POLICY "delete_own_ab_tests" ON ab_tests FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Public read by share token (so voters can load the test)
DROP POLICY IF EXISTS "public_read_ab_tests_by_token" ON ab_tests;
CREATE POLICY "public_read_ab_tests_by_token" ON ab_tests FOR SELECT
  TO authenticated USING (status = 'published');

CREATE INDEX IF NOT EXISTS idx_ab_tests_user_id ON ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_share_token ON ab_tests(share_token);

-- ============================================================
-- ab_test_batches
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_test_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  prompt text NOT NULL DEFAULT 'Which do you prefer?',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ab_test_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_ab_test_batches" ON ab_test_batches;
CREATE POLICY "owner_select_ab_test_batches" ON ab_test_batches FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_batches.test_id AND ab_tests.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_insert_ab_test_batches" ON ab_test_batches;
CREATE POLICY "owner_insert_ab_test_batches" ON ab_test_batches FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_batches.test_id AND ab_tests.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_update_ab_test_batches" ON ab_test_batches;
CREATE POLICY "owner_update_ab_test_batches" ON ab_test_batches FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_batches.test_id AND ab_tests.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_batches.test_id AND ab_tests.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "owner_delete_ab_test_batches" ON ab_test_batches;
CREATE POLICY "owner_delete_ab_test_batches" ON ab_test_batches FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_batches.test_id AND ab_tests.user_id = auth.uid())
  );

-- Public read for published tests (voters)
DROP POLICY IF EXISTS "public_read_ab_test_batches" ON ab_test_batches;
CREATE POLICY "public_read_ab_test_batches" ON ab_test_batches FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_batches.test_id AND ab_tests.status = 'published')
  );

CREATE INDEX IF NOT EXISTS idx_ab_test_batches_test_id ON ab_test_batches(test_id);

-- ============================================================
-- ab_test_options
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_test_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES ab_test_batches(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'A' CHECK (label IN ('A', 'B')),
  image_url text NOT NULL,
  caption text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ab_test_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_select_ab_test_options" ON ab_test_options;
CREATE POLICY "owner_select_ab_test_options" ON ab_test_options FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ab_test_batches b
      JOIN ab_tests t ON t.id = b.test_id
      WHERE b.id = ab_test_options.batch_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_insert_ab_test_options" ON ab_test_options;
CREATE POLICY "owner_insert_ab_test_options" ON ab_test_options FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM ab_test_batches b
      JOIN ab_tests t ON t.id = b.test_id
      WHERE b.id = ab_test_options.batch_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_update_ab_test_options" ON ab_test_options;
CREATE POLICY "owner_update_ab_test_options" ON ab_test_options FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ab_test_batches b
      JOIN ab_tests t ON t.id = b.test_id
      WHERE b.id = ab_test_options.batch_id AND t.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM ab_test_batches b
      JOIN ab_tests t ON t.id = b.test_id
      WHERE b.id = ab_test_options.batch_id AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_delete_ab_test_options" ON ab_test_options;
CREATE POLICY "owner_delete_ab_test_options" ON ab_test_options FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ab_test_batches b
      JOIN ab_tests t ON t.id = b.test_id
      WHERE b.id = ab_test_options.batch_id AND t.user_id = auth.uid()
    )
  );

-- Public read for published tests (voters)
DROP POLICY IF EXISTS "public_read_ab_test_options" ON ab_test_options;
CREATE POLICY "public_read_ab_test_options" ON ab_test_options FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ab_test_batches b
      JOIN ab_tests t ON t.id = b.test_id
      WHERE b.id = ab_test_options.batch_id AND t.status = 'published'
    )
  );

CREATE INDEX IF NOT EXISTS idx_ab_test_options_batch_id ON ab_test_options(batch_id);

-- ============================================================
-- ab_test_votes
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_test_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES ab_test_batches(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES ab_test_options(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, voter_id)
);

ALTER TABLE ab_test_votes ENABLE ROW LEVEL SECURITY;

-- Owner can read all votes on their test's batches (for results)
DROP POLICY IF EXISTS "owner_select_ab_test_votes" ON ab_test_votes;
CREATE POLICY "owner_select_ab_test_votes" ON ab_test_votes FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM ab_test_batches b
      JOIN ab_tests t ON t.id = b.test_id
      WHERE b.id = ab_test_votes.batch_id AND t.user_id = auth.uid()
    )
  );

-- Voters can read their own votes
DROP POLICY IF EXISTS "voter_select_own_ab_test_votes" ON ab_test_votes;
CREATE POLICY "voter_select_own_ab_test_votes" ON ab_test_votes FOR SELECT
  TO authenticated USING (auth.uid() = voter_id);

-- Any authenticated user can vote on published test batches
DROP POLICY IF EXISTS "voter_insert_ab_test_votes" ON ab_test_votes;
CREATE POLICY "voter_insert_ab_test_votes" ON ab_test_votes FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = voter_id AND
    EXISTS (
      SELECT 1 FROM ab_test_batches b
      JOIN ab_tests t ON t.id = b.test_id
      WHERE b.id = ab_test_votes.batch_id AND t.status = 'published'
    )
  );

-- Voters can update/delete only their own votes
DROP POLICY IF EXISTS "voter_update_own_ab_test_votes" ON ab_test_votes;
CREATE POLICY "voter_update_own_ab_test_votes" ON ab_test_votes FOR UPDATE
  TO authenticated USING (auth.uid() = voter_id) WITH CHECK (auth.uid() = voter_id);

DROP POLICY IF EXISTS "voter_delete_own_ab_test_votes" ON ab_test_votes;
CREATE POLICY "voter_delete_own_ab_test_votes" ON ab_test_votes FOR DELETE
  TO authenticated USING (auth.uid() = voter_id);

CREATE INDEX IF NOT EXISTS idx_ab_test_votes_batch_id ON ab_test_votes(batch_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_votes_voter_id ON ab_test_votes(voter_id);
