import { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Clock,
  Users,
  ListChecks,
  Trash2,
  ExternalLink,
  Share2,
  FileText,
  Link2,
  Pencil,
  Video,
  Globe,
  Check,
  X,
} from 'lucide-react';
import {
  fetchSessionById,
  fetchTasksBySession,
  toggleTaskCompletion,
  deleteTask,
  fetchSessionParticipants,
  fetchCollaboratorRole,
  getActiveShareToken,
  dismissSessionVideo,
  fetchCwgSessionMeta,
  updateCwgSessionMeta,
} from '../lib/data';
import type { Session, Task, CollaboratorRole, CwgSessionMeta, SessionParticipantWithDetails } from '../lib/types';
import { PHASE_ORDER, CWG_PHASE_ORDER, CATEGORY_COLORS, CWG_TIMEZONE_LABELS } from '../lib/types';
import ParticipantsTab from '../components/ParticipantsTab';
import TaskAttachments from '../components/TaskAttachments';
import ShareModal from '../components/ShareModal';
import DemoVideoBanner from '../components/DemoVideoBanner';
import ReportSubmitModal from '../components/ReportSubmitModal';
import CwgEmailPanel from '../components/CwgEmailPanel';
import { useAuth } from '../context/AuthContext';

interface SessionDetailPageProps {
  sessionId: string;
  onBack: () => void;
}

type DetailTab = 'tasks' | 'participants';

function getDaysRemaining(testDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(testDate + 'T00:00:00');
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isOverdue(dueDateStr: string, isCompleted: boolean): boolean {
  if (isCompleted) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + 'T00:00:00');
  return due < today;
}

interface CwgRecordingPanelProps {
  cwgMeta: CwgSessionMeta;
  sessionId: string;
  canEdit: boolean;
  onUpdated: (meta: Partial<CwgSessionMeta>) => void;
}

function CwgRecordingPanel({ cwgMeta, sessionId, canEdit, onUpdated }: CwgRecordingPanelProps) {
  const [editing, setEditing] = useState(!cwgMeta.recording_link);
  const [recLink, setRecLink] = useState(cwgMeta.recording_link ?? '');
  const [recPass, setRecPass] = useState(cwgMeta.recording_passcode ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateCwgSessionMeta(sessionId, {
        recording_link: recLink.trim() || null,
        recording_passcode: recPass.trim() || null,
      });
      onUpdated({ recording_link: recLink.trim() || null, recording_passcode: recPass.trim() || null });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!editing && cwgMeta.recording_link) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
          <Video className="w-5 h-5 text-teal-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Meeting Recording</p>
          <a
            href={cwgMeta.recording_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-teal-600 hover:text-teal-800 hover:underline flex items-center gap-1.5 min-w-0"
          >
            <span className="truncate">{cwgMeta.recording_link}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
          {cwgMeta.recording_passcode && (
            <p className="text-xs text-slate-500 mt-0.5">Passcode: {cwgMeta.recording_passcode}</p>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shrink-0"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>
    );
  }

  if (!canEdit) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
          <Video className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">Add Recording</p>
          <p className="text-xs text-slate-500">Share the meeting recording with participants</p>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Recording Link</label>
          <input
            type="url"
            value={recLink}
            onChange={(e) => setRecLink(e.target.value)}
            placeholder="https://zoom.us/rec/..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Passcode (optional)</label>
          <input
            type="text"
            value={recPass}
            onChange={(e) => setRecPass(e.target.value)}
            placeholder="Recording passcode..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex gap-2 pt-1">
          {cwgMeta.recording_link && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 px-3 py-2 border border-slate-200 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !recLink.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save Recording
          </button>
        </div>
      </div>
    </div>
  );
}

interface CwgMeetingDetailsBarProps {
  cwgMeta: CwgSessionMeta;
  sessionId: string;
  canEdit: boolean;
  onUpdated: (meta: Partial<CwgSessionMeta>) => void;
}

function CwgMeetingDetailsBar({ cwgMeta, sessionId, canEdit, onUpdated }: CwgMeetingDetailsBarProps) {
  const [editing, setEditing] = useState(false);
  const [link, setLink] = useState(cwgMeta.meeting_link ?? '');
  const [tz, setTz] = useState(cwgMeta.timezone ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateCwgSessionMeta(sessionId, {
        meeting_link: link.trim() || null,
        timezone: tz.trim() || null,
      });
      onUpdated({ meeting_link: link.trim() || null, timezone: tz.trim() || null });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {cwgMeta.meeting_link && !editing && (
        <a
          href={cwgMeta.meeting_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-teal-600 hover:text-teal-800 hover:underline transition-colors"
        >
          <Link2 className="w-4 h-4" />
          Join Meeting
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
      {cwgMeta.timezone && !editing && (
        <span className="flex items-center gap-1.5 text-sm text-slate-500">
          <Globe className="w-4 h-4" />
          {CWG_TIMEZONE_LABELS[cwgMeta.timezone] ?? cwgMeta.timezone}
        </span>
      )}
      {canEdit && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          {cwgMeta.meeting_link ? 'Edit' : 'Add meeting link'}
        </button>
      )}
      {editing && (
        <div className="flex items-center gap-2 flex-wrap w-full mt-1">
          <input
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Meeting link (Zoom, Teams...)"
            className="flex-1 min-w-[200px] px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <input
            type="text"
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            placeholder="Time zone"
            className="w-40 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save
          </button>
          <button
            onClick={() => { setEditing(false); setLink(cwgMeta.meeting_link ?? ''); setTz(cwgMeta.timezone ?? ''); }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-1.5"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function SessionDetailPage({ sessionId, onBack }: SessionDetailPageProps) {
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DetailTab>('tasks');
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set([...PHASE_ORDER, ...CWG_PHASE_ORDER]));
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [participants, setParticipants] = useState<SessionParticipantWithDetails[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [hasActiveShareLink, setHasActiveShareLink] = useState(false);
  const [collaboratorRole, setCollaboratorRole] = useState<CollaboratorRole | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [cwgMeta, setCwgMeta] = useState<CwgSessionMeta | null>(null);
  const reportModalShownRef = useRef(false);

  const isCwg = session?.session_type === 'client_working_group';
  const phaseOrder = isCwg ? CWG_PHASE_ORDER : PHASE_ORDER;

  useEffect(() => {
    loadData();
  }, [sessionId]);

  useEffect(() => {
    if (loading) return;
    const canEdit = isOwner || collaboratorRole === 'editor';
    if (!canEdit || isCwg) return;
    const total = tasks.length;
    const completed = tasks.filter((t) => t.is_completed).length;
    const allDone = total > 0 && completed === total;
    const hasReport = !!session?.report_url;
    if (allDone && !hasReport && !reportModalShownRef.current) {
      reportModalShownRef.current = true;
      setShowReportModal(true);
    }
  }, [tasks, loading, isOwner, collaboratorRole, session?.report_url, isCwg]);

  async function loadData() {
    setLoading(true);
    try {
      const [s, t, participantsResult] = await Promise.all([
        fetchSessionById(sessionId),
        fetchTasksBySession(sessionId),
        fetchSessionParticipants(sessionId).catch(() => null),
      ]);
      setSession(s);
      setTasks(t);
      const parts = participantsResult ?? [];
      setParticipants(parts);
      setParticipantCount(parts.length);

      if (s && user) {
        const ownerCheck = s.user_id === user.id;
        setIsOwner(ownerCheck);
        if (!ownerCheck) {
          const role = await fetchCollaboratorRole(sessionId, user.id);
          setCollaboratorRole(role);
        }
        const shareToken = await getActiveShareToken(sessionId);
        setHasActiveShareLink(!!shareToken);

        if (s.session_type === 'client_working_group') {
          const meta = await fetchCwgSessionMeta(sessionId);
          setCwgMeta(meta);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  const handleToggle = useCallback(async (taskId: string, currentValue: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(taskId));
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, is_completed: !currentValue } : t))
    );
    try {
      await toggleTaskCompletion(taskId, !currentValue);
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, is_completed: currentValue } : t))
      );
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await deleteTask(taskId);
    } catch {
      loadData();
    }
  }, []);

  const handleDismissVideo = useCallback(async () => {
    setSession((prev) => prev ? { ...prev, video_dismissed: true } : prev);
    try {
      await dismissSessionVideo(sessionId);
    } catch {
      setSession((prev) => prev ? { ...prev, video_dismissed: false } : prev);
    }
  }, [sessionId]);

  function togglePhase(phase: string) {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) next.delete(phase);
      else next.add(phase);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-600">Session not found.</p>
        <button onClick={onBack} className="text-blue-600 hover:underline text-sm">
          Go back
        </button>
      </div>
    );
  }

  const completedCount = tasks.filter((t) => t.is_completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const daysRemaining = getDaysRemaining(session.test_date);
  const canEdit = isOwner || collaboratorRole === 'editor';

  const badgeClass =
    daysRemaining < 0
      ? 'bg-red-100 text-red-700 border-red-200'
      : daysRemaining <= 7
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : isCwg
      ? 'bg-teal-100 text-teal-700 border-teal-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';

  const badgeLabel =
    daysRemaining < 0
      ? `${Math.abs(daysRemaining)} days ago`
      : daysRemaining === 0
      ? isCwg ? 'Meeting Today!' : 'Test Day!'
      : `${daysRemaining} days remaining`;

  const groupedTasks = phaseOrder.reduce<Record<string, Task[]>>((acc, phase) => {
    acc[phase] = tasks.filter((t) => t.phase === phase);
    return acc;
  }, {});

  const accentColor = isCwg ? 'teal' : 'blue';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-slate-900">{session.name}</h1>
                {isCwg && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                    CWG
                  </span>
                )}
                {!isOwner && collaboratorRole && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    collaboratorRole === 'editor'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-sky-100 text-sky-700'
                  }`}>
                    {collaboratorRole === 'editor' ? 'Editor' : 'Viewer'}
                  </span>
                )}
              </div>
              {session.description && (
                <p className="text-slate-500 text-sm">{session.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isOwner && (
                <button
                  onClick={() => setShowShareModal(true)}
                  className={`relative flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-${accentColor}-600 hover:bg-${accentColor}-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-${accentColor}-200 transition-all`}
                  title="Share session"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                  {hasActiveShareLink && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                </button>
              )}
              <span className={`text-sm font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap ${badgeClass}`}>
                {badgeLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <CalendarDays className="w-4 h-4" />
            <span>
              {isCwg ? 'Meeting Date' : 'Test Date'}:{' '}
              <strong className="text-slate-700">{formatDate(session.test_date)}</strong>
            </span>
          </div>

          {isCwg && cwgMeta && (
            <div className="mb-4">
              <CwgMeetingDetailsBar
                cwgMeta={cwgMeta}
                sessionId={sessionId}
                canEdit={canEdit}
                onUpdated={(fields) => setCwgMeta((prev) => prev ? { ...prev, ...fields } : prev)}
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Overall Progress</span>
              <span className="font-semibold text-slate-700">
                {completedCount} / {totalCount} tasks &mdash; {progress}%
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progress === 100 ? 'bg-emerald-500' : isCwg ? 'bg-teal-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {session.report_url && !isCwg && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
              {session.report_type === 'file' ? (
                <FileText className="w-5 h-5 text-emerald-600" />
              ) : (
                <Link2 className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Usability Report</p>
              <a
                href={session.report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 min-w-0"
              >
                <span className="truncate">
                  {session.report_type === 'file' ? 'View uploaded report' : session.report_url}
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
            {canEdit && (
              <button
                onClick={() => setShowReportModal(true)}
                title="Replace report"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shrink-0"
              >
                <Pencil className="w-3.5 h-3.5" />
                Replace
              </button>
            )}
          </div>
        )}

        {isCwg && cwgMeta && daysRemaining <= 0 && (
          <div className="mb-6">
            <CwgRecordingPanel
              cwgMeta={cwgMeta}
              sessionId={sessionId}
              canEdit={canEdit}
              onUpdated={(fields) => setCwgMeta((prev) => prev ? { ...prev, ...fields } : prev)}
            />
          </div>
        )}

        {!session.video_dismissed && !isCwg && (
          <div className="mb-6">
            <DemoVideoBanner
              sessionId={sessionId}
              canDismiss={canEdit}
              onDismiss={handleDismissVideo}
            />
          </div>
        )}

        {isCwg && cwgMeta && (
          <div className="mb-6">
            <CwgEmailPanel
              session={session}
              cwgMeta={cwgMeta}
              participants={participants}
              tasks={tasks}
              onMetaUpdated={async () => {
                const meta = await fetchCwgSessionMeta(sessionId);
                setCwgMeta(meta);
              }}
            />
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 px-6">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'tasks'
                  ? `border-${accentColor}-600 text-${accentColor}-600`
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Tasks
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'tasks'
                  ? `bg-${accentColor}-100 text-${accentColor}-700`
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {completedCount}/{totalCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'participants'
                  ? `border-${accentColor}-600 text-${accentColor}-600`
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              {isCwg ? 'Attendees' : 'Participants'}
              {participantCount !== null && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === 'participants'
                    ? `bg-${accentColor}-100 text-${accentColor}-700`
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {participantCount}
                </span>
              )}
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'tasks' && (
              <div className="space-y-3">
                {phaseOrder.map((phase) => {
                  const phaseTasks = groupedTasks[phase] ?? [];
                  if (phaseTasks.length === 0) return null;

                  const phaseCompleted = phaseTasks.filter((t) => t.is_completed).length;
                  const phaseTotal = phaseTasks.length;
                  const isExpanded = expandedPhases.has(phase);
                  const hasOverdue = phaseTasks.some((t) => isOverdue(t.due_date, t.is_completed));

                  return (
                    <div
                      key={phase}
                      className="rounded-xl border border-slate-200 overflow-hidden"
                    >
                      <button
                        onClick={() => togglePhase(phase)}
                        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="font-semibold text-slate-900 text-sm">{phase}</span>
                          {hasOverdue && <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                          {!isCwg && phase === 'Test Day' && (
                            <a
                              href="https://sensible.com/downloads/things-a-therapist-would-say.pdf"
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-full transition-colors"
                            >
                              Things a Therapist Would Say
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">
                            {phaseCompleted}/{phaseTotal}
                          </span>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                phaseCompleted === phaseTotal && phaseTotal > 0
                                  ? 'bg-emerald-500'
                                  : isCwg ? 'bg-teal-400' : 'bg-blue-400'
                              }`}
                              style={{
                                width: `${phaseTotal > 0 ? (phaseCompleted / phaseTotal) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 divide-y divide-slate-50">
                          {phaseTasks.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              sessionId={sessionId}
                              toggling={togglingIds.has(task.id)}
                              onToggle={handleToggle}
                              onDelete={handleDeleteTask}
                              readOnly={!canEdit}
                              isCwg={isCwg}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'participants' && (
              <ParticipantsTab
                sessionId={sessionId}
                onCountChange={(count) => {
                  setParticipantCount(count);
                  fetchSessionParticipants(sessionId).then(setParticipants).catch(() => {});
                }}
                readOnly={!canEdit}
                isCwg={isCwg}
              />
            )}
          </div>
        </div>
      </div>

      {showShareModal && session && (
        <ShareModal
          sessionId={sessionId}
          sessionName={session.name}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showReportModal && session && !isCwg && (
        <ReportSubmitModal
          sessionId={sessionId}
          sessionName={session.name}
          onClose={() => setShowReportModal(false)}
          onSubmitted={(reportUrl, reportType) => {
            setSession((prev) => prev ? { ...prev, report_url: reportUrl, report_type: reportType } : prev);
            setShowReportModal(false);
          }}
        />
      )}
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  sessionId: string;
  toggling: boolean;
  onToggle: (id: string, current: boolean) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
  isCwg?: boolean;
}

function TaskRow({ task, sessionId, toggling, onToggle, onDelete, readOnly = false, isCwg = false }: TaskRowProps) {
  const overdue = isOverdue(task.due_date, task.is_completed);
  const categoryColor = CATEGORY_COLORS[task.category] ?? 'bg-slate-100 text-slate-600';

  return (
    <div
      className={`group flex items-start gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors ${
        task.is_completed ? 'opacity-60' : ''
      }`}
    >
      {readOnly ? (
        <div className="mt-0.5 shrink-0">
          {task.is_completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : overdue ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : (
            <Circle className="w-5 h-5 text-slate-200" />
          )}
        </div>
      ) : (
        <button
          onClick={() => onToggle(task.id, task.is_completed)}
          disabled={toggling}
          className="mt-0.5 shrink-0 transition-transform hover:scale-110"
        >
          {toggling ? (
            <Loader2 className={`w-5 h-5 animate-spin ${isCwg ? 'text-teal-400' : 'text-blue-400'}`} />
          ) : task.is_completed ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : overdue ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : (
            <Circle className={`w-5 h-5 text-slate-300 transition-colors ${isCwg ? 'hover:text-teal-400' : 'hover:text-blue-400'}`} />
          )}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            task.is_completed ? 'line-through text-slate-400' : 'text-slate-800'
          }`}
        >
          {task.title}
        </p>
        <div className="flex items-center flex-wrap gap-2 mt-1.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor}`}>
            {task.category}
          </span>
          <div
            className={`flex items-center gap-1 text-xs ${
              overdue ? 'text-red-500 font-semibold' : 'text-slate-400'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>
              Due: {formatDate(task.due_date)}
              {overdue && <span className="ml-1 font-bold">(Overdue!)</span>}
            </span>
          </div>
        </div>
        <TaskAttachments taskId={task.id} sessionId={sessionId} readOnly={readOnly} />
      </div>

      {!readOnly && (
        <button
          onClick={() => onDelete(task.id)}
          title="Remove this task"
          className="mt-0.5 shrink-0 p-1.5 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
