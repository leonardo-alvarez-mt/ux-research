/*
  # Remove Irrelevant Usability Testing Tasks

  ## Summary
  Removes 17 specific tasks that are no longer relevant from the master_template,
  and completely removes the "Before Each Test" and "During Test" phases.

  ## Tasks Removed by Title
  - Arrange incentives for participants (e.g., order gift certificates, requisition cash)
  - Start screening participants and scheduling them into time slots
  - Send email to participants with directions, location of the test, and contact info for test day
  - Include non-disclosure agreement in participant email if using one
  - Line up a stand-by participant in case of a no-show
  - Install and test the screen recording and screen sharing software
  - Call participants to reconfirm and ask if they have any questions
  - Do a pilot test of the scenarios
  - Prepare recording consent forms for participants
  - Prepare sets of the scenarios on individual pieces of paper
  - Prepare extra copies of the non-disclosure agreement (if using one)
  - Prepare observer handouts: Instructions, list of scenarios, copy of test script
  - Make sure incentives for participants are ready
  - Test the screen recorder: do a short recording (including audio) and play it back
  - Test screen sharing (video and audio) with the observation setup
  - End the screen sharing session, if necessary
  - Copy screen recording files to secure storage or backup drive

  ## Phases Removed Entirely
  - "Before Each Test" (all 4 tasks)
  - "During Test" (1 task)

  ## Notes
  - The "1 Week Before" phase will become empty after these removals
  - sort_order values are re-sequenced within each affected phase to remove gaps
*/

-- Remove individual tasks by title
DELETE FROM master_template WHERE title IN (
  'Arrange incentives for participants (e.g., order gift certificates, requisition cash)',
  'Start screening participants and scheduling them into time slots',
  'Send email to participants with directions, location of the test, and contact info for test day',
  'Include non-disclosure agreement in participant email if using one',
  'Line up a stand-by participant in case of a no-show',
  'Install and test the screen recording and screen sharing software',
  'Call participants to reconfirm and ask if they have any questions',
  'Do a pilot test of the scenarios',
  'Prepare recording consent forms for participants',
  'Prepare sets of the scenarios on individual pieces of paper',
  'Prepare extra copies of the non-disclosure agreement (if using one)',
  'Prepare observer handouts: Instructions, list of scenarios, copy of test script',
  'Make sure incentives for participants are ready',
  'Test the screen recorder: do a short recording (including audio) and play it back',
  'Test screen sharing (video and audio) with the observation setup',
  'End the screen sharing session, if necessary',
  'Copy screen recording files to secure storage or backup drive'
);

-- Remove entire "Before Each Test" and "During Test" phases
DELETE FROM master_template WHERE phase IN ('Before Each Test', 'During Test');

-- Re-sequence sort_order within each phase to remove gaps
DO $$
DECLARE
  r RECORD;
  new_order INT;
BEGIN
  FOR r IN
    SELECT DISTINCT phase FROM master_template ORDER BY phase
  LOOP
    new_order := 1;
    FOR r IN
      SELECT id FROM master_template WHERE phase = r.phase ORDER BY sort_order
    LOOP
      UPDATE master_template SET sort_order = new_order WHERE id = r.id;
      new_order := new_order + 1;
    END LOOP;
  END LOOP;
END $$;
