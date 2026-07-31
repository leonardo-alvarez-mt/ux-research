import { supabase } from './supabase';
import { buildShareableUrl } from './urls';
import type {
  Session,
  Task,
  TaskAttachment,
  Participant,
  ParticipantWithSessionCount,
  ParticipantSessionEntry,
  SessionParticipantWithDetails,
  SessionShare,
  CollaboratorWithProfile,
  CollaboratorRole,
  Survey,
  SurveyQuestion,
  SurveyQuestionType,
  SurveyQuestionSettings,
  SurveyResponse,
  SurveyResponseAnswer,
  SurveyGoogleSheetsConnection,
  CwgSessionMeta,
  AbTest,
  AbTestBatch,
  AbTestOption,
  AbTestVote,
  AbTestBatchWithOptions,
  AbTestVoteWithVoter,
} from './types';

export async function fetchSessions(userId: string, archived = false): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', archived)
    .order('test_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchSessionById(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSession(
  sessionId: string,
  fields: { name: string; test_date: string; description?: string }
): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update({ name: fields.name, test_date: fields.test_date, description: fields.description ?? null })
    .eq('id', sessionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTasksBySession(sessionId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('session_id', sessionId)
    .order('due_date', { ascending: true })
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function toggleTaskCompletion(taskId: string, isCompleted: boolean): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ is_completed: isCompleted })
    .eq('id', taskId);
  if (error) throw error;
}

export async function archiveSession(sessionId: string, archived: boolean): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ is_archived: archived })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function dismissSessionVideo(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ video_dismissed: true })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function saveSessionReport(
  sessionId: string,
  reportUrl: string,
  reportType: 'link' | 'file'
): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ report_url: reportUrl, report_type: reportType })
    .eq('id', sessionId);
  if (error) throw error;
}

export async function uploadReportFile(sessionId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'pdf';
  const path = `${sessionId}/report/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('task-files').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('task-files').getPublicUrl(path);
  return data.publicUrl;
}

export async function createSessionWithTasks(
  userId: string,
  name: string,
  testDate: string,
  description: string,
  sessionType = 'usability_test'
): Promise<Session> {
  const { data: sessionRows, error: sessionError } = await supabase
    .from('sessions')
    .insert({ user_id: userId, name, test_date: testDate, description, session_type: sessionType })
    .select();
  if (sessionError) throw new Error(sessionError.message || 'Could not create session. Please sign out and back in.');
  if (!sessionRows || sessionRows.length === 0) throw new Error('Session was not created. Your login session may have expired — please sign out and back in.');
  const session = sessionRows[0];

  const { data: templates, error: templateError } = await supabase
    .from('master_template')
    .select('*')
    .order('day_offset', { ascending: true })
    .order('sort_order', { ascending: true });
  if (templateError) throw templateError;

  if (templates && templates.length > 0) {
    const base = new Date(testDate + 'T00:00:00');
    const taskRows = templates.map((t) => {
      const due = new Date(base);
      due.setDate(base.getDate() + t.day_offset);
      return {
        session_id: session.id,
        title: t.title,
        phase: t.phase,
        due_date: due.toISOString().split('T')[0],
        is_completed: false,
        category: t.category,
        sort_order: t.sort_order,
        _template_id: t.id,
      };
    });

    const { data: insertedTasks, error: tasksError } = await supabase
      .from('tasks')
      .insert(taskRows.map(({ _template_id: _tid, ...rest }) => rest))
      .select();
    if (tasksError) throw new Error(tasksError.message || 'Failed to create tasks.');

    try {
      const { data: defaultAttachments } = await supabase
        .from('master_template_attachments')
        .select('*');

      if (defaultAttachments && defaultAttachments.length > 0 && insertedTasks) {
        const templateIdToTaskId = new Map<number, string>();
        for (let i = 0; i < taskRows.length; i++) {
          const inserted = insertedTasks.find(
            (t) =>
              t.title === taskRows[i].title &&
              t.phase === taskRows[i].phase &&
              t.sort_order === taskRows[i].sort_order
          );
          if (inserted) {
            templateIdToTaskId.set(taskRows[i]._template_id, inserted.id);
          }
        }

        const attachmentsToInsert: {
          task_id: string;
          label: string;
          type: string;
          url: string;
          file_name: string;
        }[] = [];

        for (const att of defaultAttachments) {
          const taskId = templateIdToTaskId.get(att.template_task_id);
          if (taskId) {
            attachmentsToInsert.push({
              task_id: taskId,
              label: att.label,
              type: att.type,
              url: att.url,
              file_name: att.file_name,
            });
          }
        }

        if (attachmentsToInsert.length > 0) {
          await supabase.from('task_attachments').insert(attachmentsToInsert);
        }
      }
    } catch (_attachErr) {
      // Attachment defaults are non-critical; session and tasks are already created
    }
  }

  return session;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
  if (error) throw error;
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw error;
}

// ============================================================
// PARTICIPANTS
// ============================================================

export async function fetchParticipants(userId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .or(`user_id.eq.${userId},participant_scope.eq.internal`)
    .order('name', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchParticipantsWithSessionCount(
  userId: string,
  scope?: 'external' | 'internal'
): Promise<ParticipantWithSessionCount[]> {
  let query = supabase
    .from('participants')
    .select('*, session_participants(count)')
    .order('name', { ascending: true });
  if (scope === 'internal') {
    query = query.eq('participant_scope', 'internal');
  } else if (scope === 'external') {
    query = query.eq('user_id', userId).eq('participant_scope', 'external');
  } else {
    query = query.eq('user_id', userId);
  }
  const { data: participants, error } = await query;
  if (error) throw error;
  return (participants ?? []).map((p: Participant & { session_participants: { count: number }[] }) => ({
    ...p,
    session_count: p.session_participants?.[0]?.count ?? 0,
  }));
}

export async function updateParticipant(
  participantId: string,
  fields: { name: string; email: string; client: string; account_manager: string; notes: string; product: string; customer_type: string; participant_scope?: string }
): Promise<Participant> {
  const { data, error } = await supabase
    .from('participants')
    .update(fields)
    .eq('id', participantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteParticipant(participantId: string): Promise<void> {
  const { error } = await supabase.from('participants').delete().eq('id', participantId);
  if (error) throw error;
}

export async function fetchParticipantSessions(
  participantId: string
): Promise<ParticipantSessionEntry[]> {
  const { data, error } = await supabase
    .from('session_participants')
    .select('id, session_id, slot, status, engagement, session:sessions(name, test_date)')
    .eq('participant_id', participantId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: {
    id: string;
    session_id: string;
    slot: string;
    status: string;
    engagement: string | null;
    session: { name: string; test_date: string } | null;
  }) => ({
    session_participant_id: row.id,
    session_id: row.session_id,
    session_name: row.session?.name ?? 'Unknown',
    test_date: row.session?.test_date ?? '',
    slot: row.slot,
    status: row.status,
    engagement: row.engagement ?? null,
  }));
}

export async function updateSessionEngagement(
  sessionParticipantId: string,
  engagement: string | null
): Promise<void> {
  const { error } = await supabase
    .from('session_participants')
    .update({ engagement })
    .eq('id', sessionParticipantId);
  if (error) throw error;
}

export async function createParticipant(
  userId: string,
  fields: { name: string; email: string; client: string; account_manager: string; notes: string; product: string; customer_type: string; participant_scope: string }
): Promise<Participant> {
  const { data, error } = await supabase
    .from('participants')
    .insert({ user_id: userId, ...fields })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchSessionParticipants(sessionId: string): Promise<SessionParticipantWithDetails[]> {
  const { data, error } = await supabase
    .from('session_participants')
    .select('*, participant:participants(*)')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SessionParticipantWithDetails[];
}

export async function addParticipantToSession(
  sessionId: string,
  participantId: string,
  slot: string
): Promise<void> {
  const { error } = await supabase
    .from('session_participants')
    .insert({ session_id: sessionId, participant_id: participantId, slot, status: 'invited' });
  if (error) throw error;
}

export async function updateSessionParticipantStatus(
  sessionParticipantId: string,
  status: string
): Promise<void> {
  const { error } = await supabase
    .from('session_participants')
    .update({ status })
    .eq('id', sessionParticipantId);
  if (error) throw error;
}

export async function removeParticipantFromSession(sessionParticipantId: string): Promise<void> {
  const { error } = await supabase
    .from('session_participants')
    .delete()
    .eq('id', sessionParticipantId);
  if (error) throw error;
}

// ============================================================
// TASK ATTACHMENTS
// ============================================================

export async function fetchTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addLinkAttachment(
  taskId: string,
  label: string,
  url: string
): Promise<TaskAttachment> {
  const { data, error } = await supabase
    .from('task_attachments')
    .insert({ task_id: taskId, label, type: 'link', url, file_name: '' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addFileAttachment(
  taskId: string,
  label: string,
  url: string,
  fileName: string
): Promise<TaskAttachment> {
  const { data, error } = await supabase
    .from('task_attachments')
    .insert({ task_id: taskId, label, type: 'file', url, file_name: fileName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  const { error } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId);
  if (error) throw error;
}

export async function uploadTaskFile(
  sessionId: string,
  taskId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${sessionId}/${taskId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('task-files')
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from('task-files').getPublicUrl(path);
  return urlData.publicUrl;
}

// ============================================================
// SESSION SHARES (public link)
// ============================================================

export async function getOrCreateShareToken(sessionId: string, userId: string): Promise<SessionShare> {
  const { data: existing } = await supabase
    .from('session_shares')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .maybeSingle();
  if (existing) return existing as SessionShare;

  const { data, error } = await supabase
    .from('session_shares')
    .insert({ session_id: sessionId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as SessionShare;
}

export async function getActiveShareToken(sessionId: string): Promise<SessionShare | null> {
  const { data } = await supabase
    .from('session_shares')
    .select('*')
    .eq('session_id', sessionId)
    .eq('is_active', true)
    .maybeSingle();
  return data as SessionShare | null;
}

export async function revokeShareToken(shareId: string): Promise<void> {
  const { error } = await supabase
    .from('session_shares')
    .update({ is_active: false })
    .eq('id', shareId);
  if (error) throw error;
}

export interface SharedSessionData {
  session: Session;
  tasks: Task[];
  participants: SessionParticipantWithDetails[];
  task_attachments: TaskAttachment[];
  owner_profile: { full_name: string; email: string } | null;
}

export async function fetchSessionByShareToken(token: string): Promise<SharedSessionData | null> {
  const { data, error } = await supabase.rpc('get_shared_session_data', { p_token: token });
  if (error) throw error;
  if (!data) return null;
  return data as SharedSessionData;
}

// ============================================================
// SESSION COLLABORATORS
// ============================================================

export async function fetchCollaborators(sessionId: string): Promise<CollaboratorWithProfile[]> {
  const { data, error } = await supabase
    .from('session_collaborators')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CollaboratorWithProfile[];
}

export async function inviteCollaborator(
  sessionId: string,
  inviteeEmail: string,
  role: CollaboratorRole,
  invitedBy: string
): Promise<void> {
  const { error } = await supabase.from('session_collaborators').insert({
    session_id: sessionId,
    invitee_email: inviteeEmail,
    role,
    invited_by: invitedBy,
  });
  if (error) throw error;
}

export async function updateCollaboratorRole(
  collaboratorId: string,
  role: CollaboratorRole
): Promise<void> {
  const { error } = await supabase
    .from('session_collaborators')
    .update({ role })
    .eq('id', collaboratorId);
  if (error) throw error;
}

export async function removeCollaborator(collaboratorId: string): Promise<void> {
  const { error } = await supabase
    .from('session_collaborators')
    .delete()
    .eq('id', collaboratorId);
  if (error) throw error;
}

export interface SessionWithStats {
  session: Session;
  completedCount: number;
  totalCount: number;
  isShared?: boolean;
}

export async function fetchSharedWithMeSessions(userId: string): Promise<SessionWithStats[]> {
  const { data: collabs, error } = await supabase
    .from('session_collaborators')
    .select('session_id, role')
    .eq('invitee_user_id', userId);
  if (error) throw error;
  if (!collabs || collabs.length === 0) return [];

  const sessionIds = collabs.map((c) => c.session_id);
  const { data: sessions, error: sessError } = await supabase
    .from('sessions')
    .select('*')
    .in('id', sessionIds)
    .eq('is_archived', false)
    .order('test_date', { ascending: true });
  if (sessError) throw sessError;

  const withStats = await Promise.all(
    (sessions ?? []).map(async (session) => {
      const tasks: Task[] = await fetchTasksBySession(session.id);
      return {
        session,
        completedCount: tasks.filter((t) => t.is_completed).length,
        totalCount: tasks.length,
        isShared: true,
      };
    })
  );
  return withStats;
}

export async function fetchCollaboratorRole(
  sessionId: string,
  userId: string
): Promise<CollaboratorRole | null> {
  const { data } = await supabase
    .from('session_collaborators')
    .select('role')
    .eq('session_id', sessionId)
    .eq('invitee_user_id', userId)
    .maybeSingle();
  if (!data) return null;
  return data.role as CollaboratorRole;
}

// ============================================================
// SURVEYS
// ============================================================

export async function fetchSurveys(userId: string): Promise<Survey[]> {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Survey[];
}

export async function fetchSurveyById(id: string): Promise<Survey | null> {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as Survey | null;
}

export async function fetchSurveyByShareToken(token: string): Promise<Survey | null> {
  const { data, error } = await supabase
    .from('surveys')
    .select('*')
    .eq('share_token', token)
    .eq('status', 'published')
    .maybeSingle();
  if (error) throw error;
  return data as Survey | null;
}

export async function createSurvey(userId: string): Promise<Survey> {
  const { data, error } = await supabase
    .from('surveys')
    .insert({ user_id: userId, title: 'Untitled Survey', description: '', status: 'draft' })
    .select()
    .single();
  if (error) throw error;
  return data as Survey;
}

export async function updateSurvey(
  surveyId: string,
  fields: Partial<Pick<Survey, 'title' | 'description' | 'status'>>
): Promise<Survey> {
  const { data, error } = await supabase
    .from('surveys')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', surveyId)
    .select()
    .single();
  if (error) throw error;
  return data as Survey;
}

export async function deleteSurvey(surveyId: string): Promise<void> {
  const { error } = await supabase.from('surveys').delete().eq('id', surveyId);
  if (error) throw error;
}

// ============================================================
// SURVEY QUESTIONS
// ============================================================

export async function fetchSurveyQuestions(surveyId: string): Promise<SurveyQuestion[]> {
  const { data, error } = await supabase
    .from('survey_questions')
    .select('*')
    .eq('survey_id', surveyId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SurveyQuestion[];
}

export async function addSurveyQuestion(
  surveyId: string,
  type: SurveyQuestionType,
  sortOrder: number
): Promise<SurveyQuestion> {
  const defaultSettings: SurveyQuestionSettings =
    type === 'multiple_choice' || type === 'single_choice'
      ? { choices: ['Option A', 'Option B'] }
      : type === 'rating'
      ? { ratingMax: 5 }
      : {};

  const { data, error } = await supabase
    .from('survey_questions')
    .insert({
      survey_id: surveyId,
      type,
      title: '',
      description: '',
      required: false,
      sort_order: sortOrder,
      settings: defaultSettings,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SurveyQuestion;
}

export async function updateSurveyQuestion(
  questionId: string,
  fields: Partial<Pick<SurveyQuestion, 'type' | 'title' | 'description' | 'required' | 'sort_order' | 'settings'>>
): Promise<SurveyQuestion> {
  const { data, error } = await supabase
    .from('survey_questions')
    .update(fields)
    .eq('id', questionId)
    .select()
    .single();
  if (error) throw error;
  return data as SurveyQuestion;
}

export async function deleteSurveyQuestion(questionId: string): Promise<void> {
  const { error } = await supabase.from('survey_questions').delete().eq('id', questionId);
  if (error) throw error;
}

export async function reorderSurveyQuestions(
  updates: { id: string; sort_order: number }[]
): Promise<void> {
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from('survey_questions').update({ sort_order }).eq('id', id)
    )
  );
}

// ============================================================
// SURVEY RESPONSES
// ============================================================

export interface SurveyResponseWithAnswers {
  response: SurveyResponse;
  answers: SurveyResponseAnswer[];
}

export async function fetchSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
  const { data, error } = await supabase
    .from('survey_responses')
    .select('*')
    .eq('survey_id', surveyId)
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as SurveyResponse[];
}

export async function fetchSurveyResponseAnswers(responseId: string): Promise<SurveyResponseAnswer[]> {
  const { data, error } = await supabase
    .from('survey_response_answers')
    .select('*')
    .eq('response_id', responseId);
  if (error) throw error;
  return (data ?? []) as SurveyResponseAnswer[];
}

export async function submitSurveyResponse(
  surveyId: string,
  answers: { question_id: string; answer: { value: string | string[] | number } }[]
): Promise<void> {
  const responseId = crypto.randomUUID();

  const { error: responseError } = await supabase
    .from('survey_responses')
    .insert({ id: responseId, survey_id: surveyId });
  if (responseError) throw responseError;

  if (answers.length > 0) {
    const answerRows = answers.map((a) => ({
      response_id: responseId,
      question_id: a.question_id,
      answer: a.answer,
    }));
    const { error: answersError } = await supabase
      .from('survey_response_answers')
      .insert(answerRows);
    if (answersError) throw answersError;
  }
}

// ============================================================
// SURVEY GOOGLE SHEETS CONNECTIONS
// ============================================================

export async function fetchSurveyGoogleSheetsConnection(
  surveyId: string,
  userId: string
): Promise<SurveyGoogleSheetsConnection | null> {
  const { data, error } = await supabase
    .from('survey_google_sheets_connections')
    .select('*')
    .eq('survey_id', surveyId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as SurveyGoogleSheetsConnection | null;
}

export async function upsertSurveyGoogleSheetsConnection(
  connection: Omit<SurveyGoogleSheetsConnection, 'id' | 'created_at'>
): Promise<SurveyGoogleSheetsConnection> {
  const { data, error } = await supabase
    .from('survey_google_sheets_connections')
    .upsert(connection, { onConflict: 'survey_id,user_id' })
    .select()
    .single();
  if (error) throw error;
  return data as SurveyGoogleSheetsConnection;
}

export async function deleteSurveyGoogleSheetsConnection(
  surveyId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('survey_google_sheets_connections')
    .delete()
    .eq('survey_id', surveyId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateSurveyGoogleSheetsLastSynced(
  connectionId: string
): Promise<void> {
  const { error } = await supabase
    .from('survey_google_sheets_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', connectionId);
  if (error) throw error;
}

// ============================================================
// CLIENT WORKING GROUP (CWG)
// ============================================================

export async function createCwgSessionWithTasks(
  userId: string,
  name: string,
  meetingDate: string,
  description: string,
  meetingLink: string,
  timezone: string
): Promise<Session> {
  const { data: sessionRows, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      name,
      test_date: meetingDate,
      description,
      session_type: 'client_working_group',
    })
    .select();
  if (sessionError) throw new Error(sessionError.message || 'Could not create CWG session.');
  if (!sessionRows || sessionRows.length === 0) throw new Error('CWG session was not created. Please sign out and back in.');
  const session = sessionRows[0];

  await supabase.from('cwg_session_meta').insert({
    session_id: session.id,
    meeting_link: meetingLink || null,
    timezone: timezone || null,
  });

  const { data: templates, error: templateError } = await supabase
    .from('cwg_master_template')
    .select('*')
    .order('day_offset', { ascending: true })
    .order('sort_order', { ascending: true });
  if (templateError) throw templateError;

  if (templates && templates.length > 0) {
    const base = new Date(meetingDate + 'T00:00:00');
    const taskRows = templates.map((t) => {
      const due = new Date(base);
      due.setDate(base.getDate() + t.day_offset);
      return {
        session_id: session.id,
        title: t.title,
        phase: t.phase,
        due_date: due.toISOString().split('T')[0],
        is_completed: false,
        category: t.category,
        sort_order: t.sort_order,
        _template_id: t.id,
      };
    });

    const { data: insertedTasks, error: tasksError } = await supabase
      .from('tasks')
      .insert(taskRows.map(({ _template_id: _tid, ...rest }) => rest))
      .select();
    if (tasksError) throw new Error(tasksError.message || 'Failed to create CWG tasks.');

    try {
      const { data: defaultAttachments } = await supabase
        .from('cwg_master_template_attachments')
        .select('*');

      if (defaultAttachments && defaultAttachments.length > 0 && insertedTasks) {
        const templateIdToTaskId = new Map<number, string>();
        for (let i = 0; i < taskRows.length; i++) {
          const inserted = insertedTasks.find(
            (t) =>
              t.title === taskRows[i].title &&
              t.phase === taskRows[i].phase &&
              t.sort_order === taskRows[i].sort_order
          );
          if (inserted) {
            templateIdToTaskId.set(taskRows[i]._template_id, inserted.id);
          }
        }

        const attachmentsToInsert: {
          task_id: string;
          label: string;
          type: string;
          url: string;
          file_name: string;
        }[] = [];

        for (const att of defaultAttachments) {
          const taskId = templateIdToTaskId.get(att.template_task_id);
          if (taskId && att.url) {
            attachmentsToInsert.push({
              task_id: taskId,
              label: att.label,
              type: att.type,
              url: att.url,
              file_name: att.file_name,
            });
          }
        }

        if (attachmentsToInsert.length > 0) {
          await supabase.from('task_attachments').insert(attachmentsToInsert);
        }
      }
    } catch (_attachErr) {
      // Non-critical
    }
  }

  return session;
}

export async function fetchCwgSessionMeta(sessionId: string): Promise<CwgSessionMeta | null> {
  const { data, error } = await supabase
    .from('cwg_session_meta')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as CwgSessionMeta | null;
}

export async function updateCwgSessionMeta(
  sessionId: string,
  fields: {
    meeting_link?: string | null;
    timezone?: string | null;
    recording_link?: string | null;
    recording_passcode?: string | null;
  }
): Promise<void> {
  const { error } = await supabase
    .from('cwg_session_meta')
    .update(fields)
    .eq('session_id', sessionId);
  if (error) throw error;
}

export async function markCwgRecapSent(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('cwg_session_meta')
    .update({ recap_sent_at: new Date().toISOString() })
    .eq('session_id', sessionId);
  if (error) throw error;
}

export async function markCwgFollowupSent(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('cwg_session_meta')
    .update({ followup_sent_at: new Date().toISOString() })
    .eq('session_id', sessionId);
  if (error) throw error;
}

export async function sendCwgEmail(payload: {
  type: string;
  to: string[];
  cc: string[];
  subject: string;
  htmlMessage: string;
  plainMessage: string;
  replyTo?: string;
  accessToken: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-cwg-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${payload.accessToken}`,
      },
      body: JSON.stringify({
        type: payload.type,
        to: payload.to,
        cc: payload.cc,
        subject: payload.subject,
        htmlMessage: payload.htmlMessage,
        plainMessage: payload.plainMessage,
        replyTo: payload.replyTo,
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { ok: false, error: (body as { error?: string }).error ?? 'Failed to send email.' };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error.' };
  }
}

// ============================================================
// A/B TESTS
// ============================================================

export interface AbTestBatchInput {
  prompt: string;
  optionA: { file: File; caption: string };
  optionB: { file: File; caption: string };
}

export async function uploadAbTestImage(testId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png';
  const path = `ab-tests/${testId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('task-files')
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('task-files').getPublicUrl(path);
  return data.publicUrl;
}

export async function createAbTest(
  userId: string,
  title: string,
  description: string,
  batches: AbTestBatchInput[]
): Promise<AbTest> {
  const { data: test, error: testError } = await supabase
    .from('ab_tests')
    .insert({
      user_id: userId,
      title: title.trim(),
      description: description.trim(),
      status: 'published',
    })
    .select()
    .single();
  if (testError) throw new Error(testError.message);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];

    const urlA = await uploadAbTestImage(test.id, batch.optionA.file);
    const urlB = await uploadAbTestImage(test.id, batch.optionB.file);

    const { data: batchRow, error: batchError } = await supabase
      .from('ab_test_batches')
      .insert({
        test_id: test.id,
        prompt: batch.prompt.trim() || 'Which do you prefer?',
        sort_order: i,
      })
      .select()
      .single();
    if (batchError) throw new Error(batchError.message);

    const { error: optError } = await supabase.from('ab_test_options').insert([
      { batch_id: batchRow.id, label: 'A', image_url: urlA, caption: batch.optionA.caption.trim() },
      { batch_id: batchRow.id, label: 'B', image_url: urlB, caption: batch.optionB.caption.trim() },
    ]);
    if (optError) throw new Error(optError.message);
  }

  return test as AbTest;
}

export async function fetchAbTests(userId: string): Promise<AbTest[]> {
  const { data, error } = await supabase
    .from('ab_tests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AbTest[];
}

export async function fetchAbTestById(id: string): Promise<AbTest | null> {
  const { data, error } = await supabase
    .from('ab_tests')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as AbTest | null;
}

export async function fetchAbTestByShareToken(token: string): Promise<AbTest | null> {
  const { data, error } = await supabase
    .from('ab_tests')
    .select('*')
    .eq('share_token', token)
    .maybeSingle();
  if (error) throw error;
  return data as AbTest | null;
}

export async function fetchAbTestBatches(testId: string): Promise<AbTestBatchWithOptions[]> {
  const { data: batches, error } = await supabase
    .from('ab_test_batches')
    .select('*')
    .eq('test_id', testId)
    .order('sort_order', { ascending: true });
  if (error) throw error;

  if (!batches || batches.length === 0) return [];

  const batchIds = batches.map((b) => b.id);
  const { data: options, error: optError } = await supabase
    .from('ab_test_options')
    .select('*')
    .in('batch_id', batchIds)
    .order('label', { ascending: true });
  if (optError) throw optError;

  const optionsByBatch = new Map<string, AbTestOption[]>();
  for (const opt of options ?? []) {
    const arr = optionsByBatch.get(opt.batch_id) ?? [];
    arr.push(opt as AbTestOption);
    optionsByBatch.set(opt.batch_id, arr);
  }

  return batches.map((b) => ({
    ...(b as AbTestBatch),
    options: optionsByBatch.get(b.id) ?? [],
  }));
}

export async function fetchAbTestVotes(testId: string): Promise<AbTestVoteWithVoter[]> {
  const { data: batches } = await supabase
    .from('ab_test_batches')
    .select('id')
    .eq('test_id', testId);
  if (!batches || batches.length === 0) return [];

  const batchIds = batches.map((b) => b.id);
  const { data: votes, error } = await supabase
    .from('ab_test_votes')
    .select('*')
    .in('batch_id', batchIds);
  if (error) throw error;
  if (!votes || votes.length === 0) return [];

  const voterIds = [...new Set(votes.map((v) => v.voter_id))];
  const { data: voters } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', voterIds);

  const voterMap = new Map<string, { email: string | null; full_name: string | null }>();
  for (const v of voters ?? []) {
    voterMap.set(v.id, { email: v.email, full_name: v.full_name });
  }

  return votes.map((v) => {
    const info = voterMap.get(v.voter_id);
    return {
      ...(v as AbTestVote),
      voter_email: info?.email ?? null,
      voter_name: info?.full_name ?? null,
    };
  });
}

export async function fetchMyAbTestVotes(testId: string): Promise<AbTestVote[]> {
  const { data: batches } = await supabase
    .from('ab_test_batches')
    .select('id')
    .eq('test_id', testId);
  if (!batches || batches.length === 0) return [];

  const batchIds = batches.map((b) => b.id);
  const { data: votes, error } = await supabase
    .from('ab_test_votes')
    .select('*')
    .in('batch_id', batchIds);
  if (error) throw error;
  return (votes ?? []) as AbTestVote[];
}

export async function castAbTestVote(
  batchId: string,
  optionId: string,
  comment: string
): Promise<AbTestVote> {
  const { data, error } = await supabase
    .from('ab_test_votes')
    .upsert(
      { batch_id: batchId, option_id: optionId, comment: comment.trim() },
      { onConflict: 'batch_id,voter_id' }
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as AbTestVote;
}

export async function deleteAbTest(id: string): Promise<void> {
  const { error } = await supabase.from('ab_tests').delete().eq('id', id);
  if (error) throw error;
}

export async function updateAbTest(
  id: string,
  fields: { title?: string; description?: string }
): Promise<AbTest> {
  const { data, error } = await supabase
    .from('ab_tests')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as AbTest;
}

export async function addAbTestBatch(
  testId: string,
  prompt: string,
  optionA: { file: File; caption: string },
  optionB: { file: File; caption: string }
): Promise<void> {
  const { data: existing } = await supabase
    .from('ab_test_batches')
    .select('sort_order')
    .eq('test_id', testId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing && existing.length > 0 ? (existing[0] as { sort_order: number }).sort_order : -1) + 1;

  const urlA = await uploadAbTestImage(testId, optionA.file);
  const urlB = await uploadAbTestImage(testId, optionB.file);

  const { data: batchRow, error: batchError } = await supabase
    .from('ab_test_batches')
    .insert({
      test_id: testId,
      prompt: prompt.trim() || 'Which do you prefer?',
      sort_order: nextOrder,
    })
    .select()
    .single();
  if (batchError) throw new Error(batchError.message);

  const { error: optError } = await supabase.from('ab_test_options').insert([
    { batch_id: batchRow.id, label: 'A', image_url: urlA, caption: optionA.caption.trim() },
    { batch_id: batchRow.id, label: 'B', image_url: urlB, caption: optionB.caption.trim() },
  ]);
  if (optError) throw new Error(optError.message);
}

export async function deleteAbTestBatch(batchId: string): Promise<void> {
  const { error } = await supabase.from('ab_test_batches').delete().eq('id', batchId);
  if (error) throw error;
}

export async function fetchAbTestVoteCounts(testId: string): Promise<Record<string, number>> {
  const votes = await fetchAbTestVotes(testId);
  const counts: Record<string, number> = {};
  for (const v of votes) {
    counts[v.option_id] = (counts[v.option_id] ?? 0) + 1;
  }
  return counts;
}

export function buildAbTestShareUrl(token: string): string {
  return buildShareableUrl(`/abtest/${token}`);
}

