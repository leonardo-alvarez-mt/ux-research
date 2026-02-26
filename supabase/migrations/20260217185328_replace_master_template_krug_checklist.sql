/*
  # Replace Master Template with Steve Krug Usability Checklist

  ## Summary
  Truncates the existing master_template seed data and replaces it with
  the canonical Steve Krug "Rocket Surgery Made Easy" usability test checklist.
  In-person logistics tasks (booking rooms, speakerphones, projectors, lunch orders)
  have been omitted as requested. Remote/digital-friendly tasks are retained.

  ## Changes
  - Clears all existing master_template rows
  - Inserts the Krug-based task list organized by phase with correct day offsets
  - Resets the ID sequence to match new row count

  ## Phases & Day Offsets
  - "3 Weeks Before"   → -21
  - "2 Weeks Before"   → -14
  - "1 Week Before"    → -7
  - "1-2 Days Before"  → -1
  - "Test Day"         → 0
  - "Before Each Test" → 0
  - "During Test"      → 0
  - "After Each Test"  → 0
*/

TRUNCATE TABLE master_template RESTART IDENTITY CASCADE;

INSERT INTO master_template (id, title, phase, day_offset, category, sort_order) VALUES

-- ==================== 3 WEEKS BEFORE ====================
(1,  'Figure out what you''re going to be testing (site, wireframes, prototype, etc.)',  '3 Weeks Before', -21, 'Strategic Setup',        1),
(2,  'Create your list of tasks to test',                                                '3 Weeks Before', -21, 'Strategic Setup',        2),
(3,  'Decide what kind(s) of users you want to test with',                               '3 Weeks Before', -21, 'Strategic Setup',        3),
(4,  'Advertise for participants',                                                       '3 Weeks Before', -21, 'Recruiting Participants', 4),

-- ==================== 2 WEEKS BEFORE ====================
(5,  'Get feedback on your list of tasks from the project team and stakeholders',        '2 Weeks Before', -14, 'Strategic Setup',        1),
(6,  'Arrange incentives for participants (e.g., order gift certificates, requisition cash)', '2 Weeks Before', -14, 'Logistics & Planning', 2),
(7,  'Start screening participants and scheduling them into time slots',                 '2 Weeks Before', -14, 'Recruiting Participants', 3),
(8,  'Send "save the date" email inviting team members and stakeholders to attend',      '2 Weeks Before', -14, 'Logistics & Planning',   4),

-- ==================== 1 WEEK BEFORE ====================
(9,  'Send email to participants with directions, location of the test, and contact info for test day', '1 Week Before', -7, 'Recruiting Participants', 1),
(10, 'Include non-disclosure agreement in participant email if using one',               '1 Week Before', -7, 'Content & Materials',     2),
(11, 'Line up a stand-by participant in case of a no-show',                             '1 Week Before', -7, 'Recruiting Participants', 3),
(12, 'Install and test the screen recording and screen sharing software',               '1 Week Before', -7, 'Screen Recorder Test',    4),

-- ==================== 1-2 DAYS BEFORE ====================
(13, 'Call participants to reconfirm and ask if they have any questions',               '1-2 Days Before', -1, 'Recruiting Participants', 1),
(14, 'Email reminder to observers',                                                     '1-2 Days Before', -1, 'Logistics & Planning',   2),
(15, 'Finish writing the scenarios',                                                    '1-2 Days Before', -1, 'Content & Materials',    3),
(16, 'Do a pilot test of the scenarios',                                                '1-2 Days Before', -1, 'Equipment Check',        4),
(17, 'Get any user names/passwords and sample data needed for the test',                '1-2 Days Before', -1, 'Logistics & Planning',   5),
(18, 'Prepare recording consent forms for participants',                                '1-2 Days Before', -1, 'Content & Materials',    6),
(19, 'Prepare sets of the scenarios on individual pieces of paper',                     '1-2 Days Before', -1, 'Content & Materials',    7),
(20, 'Prepare extra copies of the non-disclosure agreement (if using one)',             '1-2 Days Before', -1, 'Content & Materials',    8),
(21, 'Prepare observer handouts: Instructions, list of scenarios, copy of test script', '1-2 Days Before', -1, 'Content & Materials',    9),
(22, 'Make sure incentives for participants are ready',                                 '1-2 Days Before', -1, 'Logistics & Planning',  10),

-- ==================== TEST DAY ====================
(23, 'Make sure whatever you''re testing is installed/accessible and is working',       'Test Day',         0, 'Equipment Check',        1),
(24, 'Test the screen recorder: do a short recording (including audio) and play it back', 'Test Day',       0, 'Screen Recorder Test',   2),
(25, 'Test screen sharing (video and audio) with the observation setup',                'Test Day',         0, 'Screen Recorder Test',   3),
(26, 'Turn off anything on the test computer that might interrupt the test (email, IM, reminders, virus scans)', 'Test Day', 0, 'Equipment Check', 4),
(27, 'Create bookmarks for any pages you''ll need to open during the test',             'Test Day',         0, 'Equipment Check',        5),

-- ==================== BEFORE EACH TEST ====================
(28, 'Start screen sharing session, if necessary',                                      'Before Each Test', 0, 'Facilitation',           1),
(29, 'Reload sample data, if necessary',                                                'Before Each Test', 0, 'Facilitation',           2),
(30, 'Clear the browser history',                                                       'Before Each Test', 0, 'Facilitation',           3),
(31, 'Open a neutral page (e.g., Google) in the web browser',                           'Before Each Test', 0, 'Facilitation',           4),

-- ==================== DURING TEST ====================
(32, 'While participant signs consent form — Start the screen recorder!',               'During Test',      0, 'Screen Recorder Test',   1),

-- ==================== AFTER EACH TEST ====================
(33, 'Stop the screen recorder!',                                                       'After Each Test',  0, 'Screen Recorder Test',   1),
(34, 'Save the recording!',                                                             'After Each Test',  0, 'Screen Recorder Test',   2),
(35, 'End the screen sharing session, if necessary',                                    'After Each Test',  0, 'Facilitation',           3),
(36, 'Jot down a few notes about things you observed',                                  'After Each Test',  0, 'Analysis & Reporting',   4),
(37, 'Copy screen recording files to secure storage or backup drive',                   'After Each Test',  0, 'Post-Test Cleanup',      5);
