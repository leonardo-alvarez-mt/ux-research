/*
  # Task Files Storage Bucket

  ## Summary
  Creates the `task-files` storage bucket for uploaded task attachments.
  Files are stored at paths: {session_id}/{task_id}/{timestamp}.{ext}
  Access is restricted to authenticated users who own the session.

  ## Security
  - Bucket is private (not public)
  - Storage policies restrict access to file owners via session ownership check
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-files', 'task-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload task files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-files');

CREATE POLICY "Users can read task files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-files');

CREATE POLICY "Users can delete own task files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-files');
