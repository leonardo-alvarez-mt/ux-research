export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string; created_at: string };
        Insert: { id: string; email: string; full_name?: string; created_at?: string };
        Update: { email?: string; full_name?: string };
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          test_date: string;
          description: string;
          is_archived: boolean;
          video_dismissed: boolean;
          session_type: string;
          report_url: string | null;
          report_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          test_date: string;
          description?: string;
          is_archived?: boolean;
          video_dismissed?: boolean;
          session_type?: string;
          report_url?: string | null;
          report_type?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          test_date?: string;
          description?: string;
          is_archived?: boolean;
          video_dismissed?: boolean;
          session_type?: string;
          report_url?: string | null;
          report_type?: string | null;
        };
      };
      tasks: {
        Row: {
          id: string;
          session_id: string;
          title: string;
          phase: string;
          due_date: string;
          is_completed: boolean;
          category: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          title: string;
          phase: string;
          due_date: string;
          is_completed?: boolean;
          category?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          is_completed?: boolean;
          title?: string;
          phase?: string;
          due_date?: string;
          category?: string;
          sort_order?: number;
        };
      };
      master_template: {
        Row: {
          id: number;
          title: string;
          phase: string;
          day_offset: number;
          category: string;
          sort_order: number;
        };
        Insert: never;
        Update: never;
      };
      task_attachments: {
        Row: {
          id: string;
          task_id: string;
          label: string;
          type: string;
          url: string;
          file_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          label: string;
          type: string;
          url: string;
          file_name?: string;
          created_at?: string;
        };
        Update: {
          label?: string;
          type?: string;
          url?: string;
          file_name?: string;
        };
      };
      master_template_attachments: {
        Row: {
          id: number;
          template_task_id: number;
          label: string;
          type: string;
          url: string;
          file_name: string;
        };
        Insert: never;
        Update: never;
      };
      participants: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          email: string;
          client: string;
          account_manager: string;
          notes: string;
          product: string;
          customer_type: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          email?: string;
          client?: string;
          account_manager?: string;
          notes?: string;
          product?: string;
          customer_type?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          email?: string;
          client?: string;
          account_manager?: string;
          notes?: string;
          product?: string;
          customer_type?: string;
        };
      };
      session_participants: {
        Row: {
          id: string;
          session_id: string;
          participant_id: string;
          slot: string;
          status: string;
          engagement: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          participant_id: string;
          slot?: string;
          status?: string;
          engagement?: string | null;
          created_at?: string;
        };
        Update: {
          slot?: string;
          status?: string;
          engagement?: string | null;
        };
      };
      session_shares: {
        Row: {
          id: string;
          session_id: string;
          token: string;
          created_by: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          token?: string;
          created_by: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          is_active?: boolean;
        };
      };
      session_collaborators: {
        Row: {
          id: string;
          session_id: string;
          invitee_email: string;
          invitee_user_id: string | null;
          role: 'viewer' | 'editor';
          invited_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          invitee_email: string;
          invitee_user_id?: string | null;
          role?: 'viewer' | 'editor';
          invited_by: string;
          created_at?: string;
        };
        Update: {
          role?: 'viewer' | 'editor';
        };
      };
      cwg_session_meta: {
        Row: {
          id: string;
          session_id: string;
          meeting_link: string | null;
          timezone: string | null;
          recording_link: string | null;
          recording_passcode: string | null;
          recap_sent_at: string | null;
          followup_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          meeting_link?: string | null;
          timezone?: string | null;
          recording_link?: string | null;
          recording_passcode?: string | null;
          recap_sent_at?: string | null;
          followup_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          meeting_link?: string | null;
          timezone?: string | null;
          recording_link?: string | null;
          recording_passcode?: string | null;
          recap_sent_at?: string | null;
          followup_sent_at?: string | null;
        };
      };
      cwg_master_template: {
        Row: {
          id: number;
          title: string;
          phase: string;
          day_offset: number;
          category: string;
          sort_order: number;
        };
        Insert: never;
        Update: never;
      };
      cwg_master_template_attachments: {
        Row: {
          id: number;
          template_task_id: number;
          label: string;
          type: string;
          url: string;
          file_name: string;
        };
        Insert: never;
        Update: never;
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type MasterTemplate = Database['public']['Tables']['master_template']['Row'];
export type TaskAttachment = Database['public']['Tables']['task_attachments']['Row'];
export type Participant = Database['public']['Tables']['participants']['Row'];
export type SessionParticipant = Database['public']['Tables']['session_participants']['Row'];
export type SessionShare = Database['public']['Tables']['session_shares']['Row'];
export type SessionCollaborator = Database['public']['Tables']['session_collaborators']['Row'];

export type CollaboratorRole = 'viewer' | 'editor';

export type SessionParticipantWithDetails = SessionParticipant & {
  participant: Participant;
};

export type CollaboratorWithProfile = SessionCollaborator & {
  profile?: Pick<Profile, 'full_name' | 'email'> | null;
};

export type ParticipantWithSessionCount = Participant & {
  session_count: number;
};

export type ParticipantSessionEntry = {
  session_participant_id: string;
  session_id: string;
  session_name: string;
  test_date: string;
  slot: string;
  status: string;
  engagement: string | null;
};

export const PARTICIPANT_STATUSES = ['invited', 'confirmed', 'completed', 'no-show'] as const;
export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export const STATUS_STYLES: Record<string, string> = {
  invited: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  'no-show': 'bg-red-100 text-red-700',
};

export const PHASE_ORDER: string[] = [
  '3 Weeks Before',
  '2 Weeks Before',
  '1 Week Before',
  '1-2 Days Before',
  'Test Day',
  'Before Each Test',
  'During Test',
  'After Each Test',
];

export type SessionType = 'usability_test' | 'user_interview' | 'client_working_group' | 'guerrilla_testing' | 'survey';

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  usability_test: 'Usability Testing',
  user_interview: 'User Interview',
  client_working_group: 'Client Working Group',
  guerrilla_testing: 'Guerrilla Testing',
  survey: 'Survey',
};

// ============================================================
// SURVEY TYPES
// ============================================================

export type SurveyQuestionType =
  | 'short_text'
  | 'long_text'
  | 'multiple_choice'
  | 'single_choice'
  | 'rating'
  | 'email'
  | 'number'
  | 'dropdown'
  | 'yes_no'
  | 'picture_choice'
  | 'nps'
  | 'opinion_scale'
  | 'ranking'
  | 'matrix'
  | 'date'
  | 'file_upload'
  | 'video'
  | 'contact_info'
  | 'phone_number'
  | 'address'
  | 'website'
  | 'legal'
  | 'welcome_screen'
  | 'statement'
  | 'end_screen';

export interface SurveyQuestionSettings {
  choices?: string[];
  ratingMax?: number;
  placeholder?: string;
}

export interface Survey {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: 'draft' | 'published';
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  type: SurveyQuestionType;
  title: string;
  description: string;
  required: boolean;
  sort_order: number;
  settings: SurveyQuestionSettings;
  created_at: string;
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  submitted_at: string;
}

export interface SurveyResponseAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer: { value: string | string[] | number };
}

export interface SurveyGoogleSheetsConnection {
  id: string;
  survey_id: string;
  user_id: string;
  spreadsheet_id: string;
  spreadsheet_url: string;
  sheet_name: string;
  google_access_token: string;
  google_refresh_token: string;
  token_expires_at: string | null;
  last_synced_at: string | null;
  created_at: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  'Strategic Setup': 'bg-blue-100 text-blue-700',
  'Recruiting Participants': 'bg-emerald-100 text-emerald-700',
  'Equipment Check': 'bg-amber-100 text-amber-700',
  'Screen Recorder Test': 'bg-orange-100 text-orange-700',
  'Logistics & Planning': 'bg-sky-100 text-sky-700',
  'Content & Materials': 'bg-violet-100 text-violet-700',
  'Facilitation': 'bg-teal-100 text-teal-700',
  'Post-Test Cleanup': 'bg-rose-100 text-rose-700',
  'Analysis & Reporting': 'bg-cyan-100 text-cyan-700',
  'Client Engagement': 'bg-blue-100 text-blue-700',
  'Communication': 'bg-sky-100 text-sky-700',
  'Preparation': 'bg-amber-100 text-amber-700',
  'Documentation & Follow-Up': 'bg-cyan-100 text-cyan-700',
};

export const CWG_PHASE_ORDER: string[] = [
  '7-14 Days Before',
  '48 Hours Before',
  '24 Hours Before',
  'Meeting Day',
  '24 Hours After',
  '1 Week After',
];

export type CwgSessionMeta = Database['public']['Tables']['cwg_session_meta']['Row'];

export type CwgEmailType = 'invite' | 'agenda' | 'reminder' | 'recap' | 'followup';

export const CWG_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
] as const;

export const CWG_TIMEZONE_LABELS: Record<string, string> = {
  'America/New_York': 'Eastern Time (ET)',
  'America/Chicago': 'Central Time (CT)',
  'America/Denver': 'Mountain Time (MT)',
  'America/Los_Angeles': 'Pacific Time (PT)',
  'America/Toronto': 'Toronto (ET)',
  'Europe/London': 'London (GMT/BST)',
  'Europe/Paris': 'Paris (CET)',
  'Europe/Berlin': 'Berlin (CET)',
  'Asia/Dubai': 'Dubai (GST)',
  'Asia/Kolkata': 'India (IST)',
  'Asia/Singapore': 'Singapore (SGT)',
  'Asia/Tokyo': 'Tokyo (JST)',
  'Australia/Sydney': 'Sydney (AEST)',
  'Pacific/Auckland': 'Auckland (NZST)',
};
