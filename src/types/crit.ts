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
  title: string;
  slug: string;
  walkthrough_url?: string;
  notes?: string;
  questions?: CritQuestion[];
  next_steps?: CritNextStep[];
  is_published: boolean;
  created_at: string;
}

export interface CritFeedback {
  id: string;
  project_id: string;
  type: 'comment' | 'poll' | 'video';
  text_content?: string;
  element_selector?: string;
  reviewer_name?: string;
  reviewer_avatar?: string;
  video_url?: string;
  created_at: string;
}
