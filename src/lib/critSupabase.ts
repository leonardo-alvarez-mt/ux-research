import { createClient } from '@supabase/supabase-js';

const critSupabaseUrl =
  import.meta.env.VITE_CRIT_SUPABASE_URL ||
  'https://twetzrmkrfwkrokaeiya.supabase.co';

const critSupabaseKey =
  import.meta.env.VITE_CRIT_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZXR6cm1rcmZ3a3Jva2FlaXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NDg3MjksImV4cCI6MjEwMjAyNDcyOX0.OrgGT7zsHZhfIuTa8Ginlj2l8b8lUmOKhfNN1avjcwA';

export const critSupabase = createClient(critSupabaseUrl, critSupabaseKey);
