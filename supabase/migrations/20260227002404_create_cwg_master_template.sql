/*
  # Create CWG Master Template

  ## Summary
  Creates the master task template for Client Working Group (CWG) sessions. This table
  seeds the checklist tasks that are automatically generated when a new CWG session is
  created. Tasks are organized across 6 phases aligned to the CWG communication cadence.

  ## New Tables

  ### cwg_master_template
  - `id` (integer, primary key) - unique task identifier
  - `title` (text) - task description
  - `phase` (text) - one of the 6 CWG phases
  - `day_offset` (integer) - days relative to meeting date (negative = before, 0 = day of, positive = after)
  - `category` (text) - task category for color coding
  - `sort_order` (integer) - display order within phase

  ### cwg_master_template_attachments
  - `id` (integer, primary key)
  - `template_task_id` (integer, FK to cwg_master_template)
  - `label` (text) - display label for the attachment
  - `type` (text) - 'link' or 'file'
  - `url` (text) - the URL
  - `file_name` (text) - filename if applicable

  ## Notes
  - These are read-only reference tables (no RLS needed, no auth required to read)
  - day_offset: -14 to -7 = "7-14 Days Before", -2 = "48 Hours Before", -1 = "24 Hours Before", 0 = "Meeting Day", 1 = "24 Hours After", 7 = "1 Week After"
*/

CREATE TABLE IF NOT EXISTS cwg_master_template (
  id          integer PRIMARY KEY,
  title       text NOT NULL,
  phase       text NOT NULL,
  day_offset  integer NOT NULL,
  category    text NOT NULL DEFAULT 'Communication',
  sort_order  integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS cwg_master_template_attachments (
  id                 integer PRIMARY KEY,
  template_task_id   integer NOT NULL REFERENCES cwg_master_template(id) ON DELETE CASCADE,
  label              text NOT NULL,
  type               text NOT NULL DEFAULT 'link',
  url                text NOT NULL DEFAULT '',
  file_name          text NOT NULL DEFAULT ''
);

INSERT INTO cwg_master_template (id, title, phase, day_offset, category, sort_order) VALUES
  (1,  'Review client support history and AM context before selecting participants', '7-14 Days Before', -14, 'Client Engagement', 1),
  (2,  'Avoid inviting participants already overwhelmed with other engagements', '7-14 Days Before', -14, 'Client Engagement', 2),
  (3,  'Confirm target group of 3-5 consistent participants', '7-14 Days Before', -14, 'Client Engagement', 3),
  (4,  'Account for global time zones when scheduling', '7-14 Days Before', -14, 'Client Engagement', 4),
  (5,  'Send CWG calendar invites to all participants with meeting link', '7-14 Days Before', -10, 'Communication', 5),
  (6,  'Address all outstanding action items from previous CWG session', '48 Hours Before', -2, 'Preparation', 1),
  (7,  'Prepare recap slides showing feedback was heard and acted upon', '48 Hours Before', -2, 'Preparation', 2),
  (8,  'Do a dry run with PMs and UX lead (Nicola, Sujith)', '48 Hours Before', -2, 'Preparation', 3),
  (9,  'Prepare meaningful mock data and realistic demo use cases', '48 Hours Before', -2, 'Preparation', 4),
  (10, 'Frame features as stories — clients attend infrequently and need context', '48 Hours Before', -2, 'Preparation', 5),
  (11, 'Share detailed agenda and preparation materials with all attendees', '48 Hours Before', -2, 'Communication', 6),
  (12, 'Send final reminder email with key prep points and meeting details', '24 Hours Before', -1, 'Communication', 1),
  (13, 'Confirm all participants have the meeting link and can access it', '24 Hours Before', -1, 'Communication', 2),
  (14, 'Finalize presenter vs. notetaker role assignments', '24 Hours Before', -1, 'Facilitation', 3),
  (15, 'Define roles: who presents, who takes notes, who manages parking lot', 'Meeting Day', 0, 'Facilitation', 1),
  (16, 'Kick off with a short icebreaker to boost engagement', 'Meeting Day', 0, 'Facilitation', 2),
  (17, 'Review previous action items with the group at the start', 'Meeting Day', 0, 'Facilitation', 3),
  (18, 'Use a parking lot for off-topic ideas (capture, do not dismiss)', 'Meeting Day', 0, 'Facilitation', 4),
  (19, 'Add Zoom/Teams polls to boost live participation', 'Meeting Day', 0, 'Facilitation', 5),
  (20, 'Capture all feedback, decisions, and new action items during the session', 'Meeting Day', 0, 'Documentation & Follow-Up', 6),
  (21, 'Start recording the meeting (with participant consent)', 'Meeting Day', 0, 'Documentation & Follow-Up', 7),
  (22, 'Send comprehensive recap email within 24 hours', '24 Hours After', 1, 'Communication', 1),
  (23, 'Include recording link, passcode, and timestamped chapters in recap', '24 Hours After', 1, 'Documentation & Follow-Up', 2),
  (24, 'Include all new action items with assignees and due dates in recap', '24 Hours After', 1, 'Documentation & Follow-Up', 3),
  (25, 'Include designs shown and key decisions made in recap', '24 Hours After', 1, 'Documentation & Follow-Up', 4),
  (26, 'Explicitly call out client homework items in the recap email', '24 Hours After', 1, 'Communication', 5),
  (27, 'Follow up on all outstanding action items from the session', '1 Week After', 7, 'Client Engagement', 1),
  (28, 'Check for blockers or unresolved concerns raised in the session', '1 Week After', 7, 'Client Engagement', 2),
  (29, 'Schedule next CWG session if applicable', '1 Week After', 7, 'Communication', 3);

INSERT INTO cwg_master_template_attachments (id, template_task_id, label, type, url, file_name) VALUES
  (1, 10, 'Features as Story SMaC', 'link', 'https://docs.google.com/document/d/1qjGO0OJ-5Brop9lMvlL6xvXAv744VlKmxJGLI-cg5Xg/edit?tab=t.0', ''),
  (2, 11, 'Agenda Email Template', 'link', '', ''),
  (3, 22, 'Meeting Recap Email Sample', 'link', '', '');
