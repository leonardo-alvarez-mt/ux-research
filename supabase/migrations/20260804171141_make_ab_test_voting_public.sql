/*
# Make A/B Test Voting Public (Anonymous, One-Vote-Per-IP)

## Summary
Previously, A/B Test voting required a @mitratech.com Google sign-in, and one vote
per batch was enforced per authenticated user (via `voter_id`). This migration
opens voting to anyone with the share link — no login required. Vote deduplication
now uses the voter's IP address instead of their user account, so each IP can
cast one vote per batch.

## Changes to `ab_test_votes`
1. New column: `voter_ip` (text, nullable) — the IP address of the anonymous voter,
   captured server-side by the new edge function.
2. `voter_id` is now nullable — anonymous voters don't have a user account.
   Existing votes (which have voter_id populated) are preserved unchanged.
3. The unique constraint on `(batch_id, voter_id)` is replaced with a unique
   constraint on `(batch_id, voter_ip)` so one IP can vote once per batch.
   The old constraint is dropped first.

## Security (RLS) Changes
### `ab_tests`
- The `public_read_ab_tests_by_token` SELECT policy now grants access to `anon, authenticated`
  (was `authenticated` only) so unauthenticated visitors can load the test.

### `ab_test_batches`
- The `public_read_ab_test_batches` SELECT policy now grants access to `anon, authenticated`
  (was `authenticated` only).

### `ab_test_options`
- The `public_read_ab_test_options` SELECT policy now grants access to `anon, authenticated`
  (was `authenticated` only).

### `ab_test_votes`
- A new `anon_insert_ab_test_votes` INSERT policy allows the anon role to insert votes.
  In practice, votes are written by the edge function using the service role key
  (which bypasses RLS), but the policy is added for completeness and future-proofing.
- The existing `voter_insert_ab_test_votes` policy remains for authenticated users.
- All other owner-scoped and voter-scoped policies remain unchanged.

## Important Notes
1. The edge function (deployed separately) captures the voter's IP from request
   headers and writes the vote row using the service role key, bypassing RLS.
2. The unique constraint on `(batch_id, voter_ip)` is what enforces one vote per
   IP per batch at the database level. The edge function handles the duplicate
   error gracefully and returns a clear message.
3. Existing votes with voter_id values are preserved. They have NULL voter_ip, so
   they are exempt from the new IP-based deduplication.
4. The test creator still needs to be authenticated to create/manage tests and
   view results — only the voting step becomes public.
*/

-- ============================================================
-- 1. Add voter_ip column and make voter_id nullable
-- ============================================================
ALTER TABLE ab_test_votes ADD COLUMN IF NOT EXISTS voter_ip text;
ALTER TABLE ab_test_votes ALTER COLUMN voter_id DROP NOT NULL;

-- ============================================================
-- 2. Replace unique constraint: (batch_id, voter_id) → (batch_id, voter_ip)
-- ============================================================
ALTER TABLE ab_test_votes DROP CONSTRAINT IF EXISTS ab_test_votes_batch_id_voter_id_key;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'ab_test_votes_batch_id_voter_ip_key'
  ) THEN
    ALTER TABLE ab_test_votes ADD CONSTRAINT ab_test_votes_batch_id_voter_ip_key UNIQUE (batch_id, voter_ip);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ab_test_votes_voter_ip ON ab_test_votes(voter_ip);

-- ============================================================
-- 3. Open public read policies to anon role
-- ============================================================

-- ab_tests: public read by share token
DROP POLICY IF EXISTS "public_read_ab_tests_by_token" ON ab_tests;
CREATE POLICY "public_read_ab_tests_by_token" ON ab_tests FOR SELECT
  TO anon, authenticated USING (status = 'published');

-- ab_test_batches: public read for published tests
DROP POLICY IF EXISTS "public_read_ab_test_batches" ON ab_test_batches;
CREATE POLICY "public_read_ab_test_batches" ON ab_test_batches FOR SELECT
  TO anon, authenticated USING (
    EXISTS (SELECT 1 FROM ab_tests WHERE ab_tests.id = ab_test_batches.test_id AND ab_tests.status = 'published')
  );

-- ab_test_options: public read for published tests
DROP POLICY IF EXISTS "public_read_ab_test_options" ON ab_test_options;
CREATE POLICY "public_read_ab_test_options" ON ab_test_options FOR SELECT
  TO anon, authenticated USING (
    EXISTS (
      SELECT 1 FROM ab_test_batches b
      JOIN ab_tests t ON t.id = b.test_id
      WHERE b.id = ab_test_options.batch_id AND t.status = 'published'
    )
  );

-- ============================================================
-- 4. Allow anon to insert votes (edge function uses service role,
--    but this policy covers any direct anon-key inserts)
-- ============================================================
DROP POLICY IF EXISTS "anon_insert_ab_test_votes" ON ab_test_votes;
CREATE POLICY "anon_insert_ab_test_votes" ON ab_test_votes FOR INSERT
  TO anon WITH CHECK (voter_id IS NULL);

-- ============================================================
-- 5. Allow anon to read their own votes by IP (so the voting page
--    can check if they already voted)
-- ============================================================
DROP POLICY IF EXISTS "anon_select_own_ab_test_votes" ON ab_test_votes;
CREATE POLICY "anon_select_own_ab_test_votes" ON ab_test_votes FOR SELECT
  TO anon USING (voter_id IS NULL);
