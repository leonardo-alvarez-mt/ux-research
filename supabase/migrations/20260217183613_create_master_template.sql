/*
  # Master Template - 40 Standard Usability Tasks

  ## Summary
  Creates the master_template reference table containing the 40 standardized
  usability testing tasks with their time offsets relative to the test date.

  ## New Table: master_template
  - `id` (integer, PK) - sequential task identifier
  - `title` (text) - task description
  - `phase` (text) - time-based phase label
  - `day_offset` (integer) - days relative to test_date (negative = before, positive = after)
  - `category` (text) - functional category of the task
  - `sort_order` (integer) - ordering within phase

  ## Phases
  - "3 Weeks Before" (-21 days)
  - "2 Weeks Before" (-14 days)
  - "1 Week Before"  (-7 days)
  - "3 Days Before"  (-3 days)
  - "1 Day Before"   (-1 day)
  - "Test Day"       (0 days)
  - "Post-Test"      (+1 to +7 days)

  ## Categories
  - Strategic Setup
  - Recruiting Participants
  - Equipment Check
  - Screen Recorder Test
  - Logistics & Planning
  - Content & Materials
  - Facilitation
  - Post-Test Cleanup
  - Analysis & Reporting

  ## Security
  - RLS enabled, all authenticated users can read (public reference data)
  - No insert/update/delete for regular users (admin-managed reference data)
*/

CREATE TABLE IF NOT EXISTS master_template (
  id integer PRIMARY KEY,
  title text NOT NULL,
  phase text NOT NULL,
  day_offset integer NOT NULL,
  category text NOT NULL DEFAULT '',
  sort_order integer DEFAULT 0
);

ALTER TABLE master_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read master template"
  ON master_template FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- SEED: 40 Standard Usability Tasks
-- ============================================================

INSERT INTO master_template (id, title, phase, day_offset, category, sort_order) VALUES

-- ==================== 3 WEEKS BEFORE (-21 days) ====================
(1,  'Define study goals and research questions',          '3 Weeks Before', -21, 'Strategic Setup',        1),
(2,  'Identify target user segments and recruitment criteria', '3 Weeks Before', -21, 'Strategic Setup',   2),
(3,  'Align stakeholders on study scope and objectives',   '3 Weeks Before', -21, 'Strategic Setup',        3),
(4,  'Draft participant screener questionnaire',           '3 Weeks Before', -21, 'Recruiting Participants', 4),
(5,  'Select and book usability testing facility or remote platform', '3 Weeks Before', -21, 'Logistics & Planning', 5),
(6,  'Create participant recruitment brief',               '3 Weeks Before', -21, 'Recruiting Participants', 6),

-- ==================== 2 WEEKS BEFORE (-14 days) ====================
(7,  'Launch participant recruitment campaign',            '2 Weeks Before', -14, 'Recruiting Participants', 1),
(8,  'Draft usability test script and task scenarios',     '2 Weeks Before', -14, 'Content & Materials',     2),
(9,  'Design prototype or confirm build version for testing', '2 Weeks Before', -14, 'Strategic Setup',     3),
(10, 'Create consent forms and NDA documents',             '2 Weeks Before', -14, 'Content & Materials',     4),
(11, 'Set up participant scheduling system (Calendly, etc.)', '2 Weeks Before', -14, 'Logistics & Planning', 5),
(12, 'Assign moderator, note-taker, and observer roles',   '2 Weeks Before', -14, 'Logistics & Planning',   6),

-- ==================== 1 WEEK BEFORE (-7 days) ====================
(13, 'Confirm all participant slots are filled',           '1 Week Before',  -7, 'Recruiting Participants', 1),
(14, 'Send calendar invites and joining instructions to participants', '1 Week Before', -7, 'Recruiting Participants', 2),
(15, 'Finalize and peer-review test script',               '1 Week Before',  -7, 'Content & Materials',    3),
(16, 'Prepare observer discussion guide and note-taking template', '1 Week Before', -7, 'Content & Materials', 4),
(17, 'Conduct pilot test with internal team member',       '1 Week Before',  -7, 'Equipment Check',        5),
(18, 'Test screen sharing and audio quality on target platform', '1 Week Before', -7, 'Screen Recorder Test', 6),
(19, 'Verify screen recording software is licensed and configured', '1 Week Before', -7, 'Screen Recorder Test', 7),
(20, 'Prepare participant incentives (gift cards, payments)', '1 Week Before', -7, 'Logistics & Planning',  8),

-- ==================== 3 DAYS BEFORE (-3 days) ====================
(21, 'Send reminder emails/messages to all confirmed participants', '3 Days Before', -3, 'Recruiting Participants', 1),
(22, 'Finalize prototype and lock version for testing',    '3 Days Before',  -3, 'Strategic Setup',        2),
(23, 'Test all equipment: webcam, microphone, second monitor', '3 Days Before', -3, 'Equipment Check',     3),
(24, 'Verify screen recorder test recordings are saving correctly', '3 Days Before', -3, 'Screen Recorder Test', 4),
(25, 'Prepare session debrief template for post-session notes', '3 Days Before', -3, 'Content & Materials', 5),
(26, 'Confirm observer access links and viewing permissions', '3 Days Before', -3, 'Logistics & Planning', 6),

-- ==================== 1 DAY BEFORE (-1 day) ====================
(27, 'Do a full end-to-end dry run of the entire session flow', '1 Day Before', -1, 'Equipment Check',     1),
(28, 'Re-test screen recorder: start, pause, stop, and save', '1 Day Before', -1, 'Screen Recorder Test', 2),
(29, 'Charge all devices and prepare backup equipment',    '1 Day Before',   -1, 'Equipment Check',        3),
(30, 'Print or prepare digital copies of consent forms',  '1 Day Before',   -1, 'Content & Materials',    4),
(31, 'Brief all team members on their roles and session schedule', '1 Day Before', -1, 'Logistics & Planning', 5),
(32, 'Set up quiet, distraction-free testing environment', '1 Day Before',  -1, 'Logistics & Planning',   6),

-- ==================== TEST DAY (0 days) ====================
(33, 'Launch screen recorder and confirm it is capturing', 'Test Day',        0, 'Screen Recorder Test',   1),
(34, 'Welcome participant and obtain signed consent',      'Test Day',        0, 'Facilitation',           2),
(35, 'Conduct warm-up questions and set participant at ease', 'Test Day',     0, 'Facilitation',           3),
(36, 'Facilitate all task scenarios per test script',      'Test Day',        0, 'Facilitation',           4),
(37, 'Conduct post-task and post-session questionnaires',  'Test Day',        0, 'Facilitation',           5),
(38, 'Save and backup all session recordings immediately', 'Test Day',        0, 'Screen Recorder Test',   6),

-- ==================== POST-TEST (+1 to +7 days) ====================
(39, 'Transcribe or tag key observations from recordings', 'Post-Test',       3, 'Analysis & Reporting',   1),
(40, 'Conduct team debrief and affinity mapping session',  'Post-Test',       5, 'Analysis & Reporting',   2),
(41, 'Compile usability findings and severity ratings',    'Post-Test',       5, 'Analysis & Reporting',   3),
(42, 'Draft findings report and prioritized recommendations', 'Post-Test',    7, 'Analysis & Reporting',   4),
(43, 'Archive recordings, notes, and consent forms securely', 'Post-Test',    7, 'Post-Test Cleanup',      5),
(44, 'Send thank-you notes and distribute participant incentives', 'Post-Test', 1, 'Post-Test Cleanup',    6)

ON CONFLICT (id) DO NOTHING;
