/*
  # Expand survey_questions type constraint

  ## Overview
  Removes the old restrictive CHECK constraint on the `type` column of `survey_questions`
  and replaces it with an expanded one that includes all new stub question types added
  to the survey builder (dropdown, yes_no, picture_choice, nps, opinion_scale, ranking,
  matrix, date, file_upload, video, contact_info, phone_number, address, website, legal,
  welcome_screen, statement, end_screen).

  ## Changes
  - `survey_questions.type` constraint updated to allow 25 question types instead of 7
*/

ALTER TABLE survey_questions
  DROP CONSTRAINT IF EXISTS survey_questions_type_check;

ALTER TABLE survey_questions
  ADD CONSTRAINT survey_questions_type_check CHECK (type IN (
    'short_text',
    'long_text',
    'multiple_choice',
    'single_choice',
    'rating',
    'email',
    'number',
    'dropdown',
    'yes_no',
    'picture_choice',
    'nps',
    'opinion_scale',
    'ranking',
    'matrix',
    'date',
    'file_upload',
    'video',
    'contact_info',
    'phone_number',
    'address',
    'website',
    'legal',
    'welcome_screen',
    'statement',
    'end_screen'
  ));
