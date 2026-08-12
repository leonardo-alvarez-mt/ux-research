export interface CritQuestion {
  id: string;
  text: string;
  poll_votes?: number;
}

export interface CritNextStep {
  id: string;
  text: string;
  completed: boolean;
}

export interface CritProject {
  id: string;
  project_id: string;
  user_id?: string;
  title?: string;
  project_url?: string;
  walkthrough_url?: string;
  notes?: string;
  questions?: CritQuestion[];
  next_steps?: CritNextStep[];
  is_published: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CritFeedback {
  id: string;
  project_id: string;
  type: 'comment' | 'poll' | 'video';
  comment?: string;
  text_content?: string;
  selector?: string;
  element_selector?: string;
  video_url?: string;
  meta?: Record<string, unknown>;
  reviewer_name?: string;
  avatar_url?: string;
  x_pos?: number;
  y_pos?: number;
  created_at: string;
}
