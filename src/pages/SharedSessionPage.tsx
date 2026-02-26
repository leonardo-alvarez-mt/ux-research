import { useEffect, useState } from 'react';
import {
  Shield,
  CalendarDays,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Loader2,
  Clock,
  Users,
  ListChecks,
  ExternalLink,
  LogIn,
  Link2,
} from 'lucide-react';
import { fetchSessionByShareToken } from '../lib/data';
import type { SharedSessionData } from '../lib/data';
import { PHASE_ORDER, CATEGORY_COLORS } from '../lib/types';
import type { Task } from '../lib/types';

interface SharedSessionPageProps {
  token: string;
  onSignIn: () => void;
}

type SharedTab = 'tasks' | 'participants';

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

export default function SharedSessionPage({ token, onSignIn }: SharedSessionPageProps) {
  const [data, setData] = useState<SharedSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<SharedTab>('tasks');
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(PHASE_ORDER));

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const result = await fetchSessionByShareToken(token);
        if (!result) {
          setNotFound(true);
        } else {
          setData(result);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-slate-50">
        <TopBar onSignIn={onSignIn} />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Link2 className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Link not found</h1>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            This share link is invalid or has been revoked. Ask the session owner to send you a new link.
          </p>
        </div>
      </div>
    );
  }

  const { session, tasks, participants, task_attachments, owner_profile } = data;
  const safeTasks = tasks ?? [];
  const safeParticipants = participants ?? [];
  const safeAttachments = task_attachments ?? [];

  const completedCount = safeTasks.filter((t) => t.is_completed).length;
  const totalCount = safeTasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const daysRemaining = getDaysRemaining(session.test_date);

  const badgeClass =
    daysRemaining < 0
      ? 'bg-red-100 text-red-700 border-red-200'
      : daysRemaining <= 7
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';

  const badgeLabel =
    daysRemaining < 0
      ? `${Math.abs(daysRemaining)} days overdue`
      : daysRemaining === 0
      ? 'Test Day!'
      : `${daysRemaining} days remaining`;

  const groupedTasks = PHASE_ORDER.reduce<Record<string, Task[]>>((acc, phase) => {
    acc[phase] = safeTasks.filter((t) => t.phase === phase);
    return acc;
  }, {});

  const attachmentsByTask = safeAttachments.reduce<Record<string, typeof safeAttachments>>(
    (acc, att) => {
      if (!acc[att.task_id]) acc[att.task_id] = [];
      acc[att.task_id].push(att);
      return acc;
    },
    {}
  );

  const ownerName = owner_profile?.full_name || owner_profile?.email || 'the session owner';

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar onSignIn={onSignIn} />

      <div className="bg-blue-600 text-white py-2.5 px-6 text-center text-sm">
        <span className="opacity-80">You are viewing a shared session shared by </span>
        <strong>{ownerName}</strong>
        <span className="opacity-80"> — </span>
        <button onClick={onSignIn} className="underline font-semibold hover:no-underline">
          Sign in to collaborate
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 mb-1">{session.name}</h1>
              {session.description && (
                <p className="text-slate-500 text-sm">{session.description}</p>
              )}
            </div>
            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap ${badgeClass}`}>
              {badgeLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-500 mb-5">
            <CalendarDays className="w-4 h-4" />
            <span>
              Test Date: <strong className="text-slate-700">{formatDate(session.test_date)}</strong>
            </span>
          </div>

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
                  progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-200 px-6">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'tasks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ListChecks className="w-4 h-4" />
              Tasks
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'tasks' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {completedCount}/{totalCount}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === 'participants'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Participants
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'participants' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {safeParticipants.length}
              </span>
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'tasks' && (
              <div className="space-y-3">
                {PHASE_ORDER.map((phase) => {
                  const phaseTasks = groupedTasks[phase] ?? [];
                  if (phaseTasks.length === 0) return null;
                  const phaseCompleted = phaseTasks.filter((t) => t.is_completed).length;
                  const phaseTotal = phaseTasks.length;
                  const isExpanded = expandedPhases.has(phase);
                  const hasOverdue = phaseTasks.some((t) => isOverdue(t.due_date, t.is_completed));

                  return (
                    <div key={phase} className="rounded-xl border border-slate-200 overflow-hidden">
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
                          {phase === 'Test Day' && (
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
                                  : 'bg-blue-400'
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
                            <ReadOnlyTaskRow
                              key={task.id}
                              task={task}
                              attachments={attachmentsByTask[task.id] ?? []}
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
              <div>
                {safeParticipants.length === 0 ? (
                  <div className="text-center py-10">
                    <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No participants added yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {safeParticipants.map((sp) => (
                      <div key={sp.id} className="flex items-center gap-4 py-3.5">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-blue-700">
                            {sp.participant.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{sp.participant.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {sp.participant.email && (
                              <span className="text-xs text-slate-400">{sp.participant.email}</span>
                            )}
                            {sp.participant.client && (
                              <span className="text-xs text-slate-400">{sp.participant.client}</span>
                            )}
                            {sp.slot && (
                              <span className="text-xs text-slate-500 font-medium">{sp.slot}</span>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={sp.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopBar({ onSignIn }: { onSignIn: () => void }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Shield className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-slate-900 font-bold text-sm leading-tight">Mitratech</p>
          <p className="text-slate-400 text-xs">UX - GRC</p>
        </div>
      </div>
      <button
        onClick={onSignIn}
        className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
      >
        <LogIn className="w-4 h-4" />
        Sign in
      </button>
    </header>
  );
}

interface ReadOnlyTaskRowProps {
  task: Task;
  attachments: { id: string; label: string; type: string; url: string; file_name: string; created_at: string; task_id: string }[];
}

function ReadOnlyTaskRow({ task, attachments }: ReadOnlyTaskRowProps) {
  const overdue = isOverdue(task.due_date, task.is_completed);
  const categoryColor = CATEGORY_COLORS[task.category] ?? 'bg-slate-100 text-slate-600';

  return (
    <div className={`flex items-start gap-4 px-5 py-3.5 ${task.is_completed ? 'opacity-60' : ''}`}>
      <div className="mt-0.5 shrink-0">
        {task.is_completed ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : overdue ? (
          <AlertCircle className="w-5 h-5 text-red-400" />
        ) : (
          <Circle className="w-5 h-5 text-slate-200" />
        )}
      </div>

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
            <span>Due: {formatDate(task.due_date)}</span>
            {overdue && <span className="font-bold">(Overdue!)</span>}
          </div>
        </div>
        {attachments.length > 0 && (
          <div className="flex items-center flex-wrap gap-2 mt-2">
            {attachments.map((att) => (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2 py-0.5 rounded-full transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                {att.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  invited: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  'no-show': 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls} capitalize`}>
      {status}
    </span>
  );
}
