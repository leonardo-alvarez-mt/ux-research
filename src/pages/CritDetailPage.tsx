import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Loader2, Play, MessageSquare, CheckSquare, Check, Plus, Copy,
  Video, FileText, StickyNote, AlertCircle, ExternalLink, Code2, Trash2, KeyRound,
  Layers, Link2,
} from 'lucide-react';
import { critSupabase } from '../lib/critSupabase';
import type { CritProject, CritFeedback, CritNextStep, CritEpic } from '../types/crit';

interface CritDetailPageProps {
  projectId: string;
  onBack: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type TabId = 'feedback' | 'next-steps';

export default function CritDetailPage({ projectId, onBack }: CritDetailPageProps) {
  const [project, setProject] = useState<CritProject | null>(null);
  const [feedback, setFeedback] = useState<CritFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('feedback');
  const [toast, setToast] = useState<string | null>(null);
  const [newTaskText, setNewTaskText] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingStepId, setDeletingStepId] = useState<string | null>(null);
  const [copiedPasscode, setCopiedPasscode] = useState(false);
  const [activeEpicId, setActiveEpicId] = useState<string>('all');
  const [copiedEpicId, setCopiedEpicId] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    const { data, error } = await critSupabase
      .from('projects')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) { console.error('Failed to load project:', error); return; }
    setProject(data as unknown as CritProject);
  }, [projectId]);

  const loadFeedback = useCallback(async () => {
    const { data, error } = await critSupabase
      .from('feedback')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    if (error) { console.error('Failed to load feedback:', error); return; }
    setFeedback((data ?? []) as unknown as CritFeedback[]);
  }, [projectId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadProject(), loadFeedback()]);
      setLoading(false);
    })();
  }, [loadProject, loadFeedback]);

  useEffect(() => {
    const channel = critSupabase
      .channel('feedback_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `project_id=eq.${projectId}` }, () => {
        loadFeedback();
      })
      .subscribe();
    return () => { critSupabase.removeChannel(channel); };
  }, [projectId, loadFeedback]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function toggleNextStep(step: CritNextStep) {
    setTogglingId(step.id);
    const updatedSteps = (project?.next_steps ?? []).map((s) =>
      s.id === step.id ? { ...s, completed: !s.completed } : s
    );
    setProject((prev) => prev ? { ...prev, next_steps: updatedSteps } : prev);
    try {
      await critSupabase
        .from('projects')
        .update({ next_steps: updatedSteps })
        .eq('project_id', projectId);
    } catch (err) {
      console.error('Failed to update step:', err);
      setProject((prev) => prev ? { ...prev, next_steps: (prev.next_steps ?? []).map((s) => s.id === step.id ? { ...s, completed: step.completed } : s) } : prev);
    } finally {
      setTogglingId(null);
    }
  }

  async function deleteNextStep(stepId: string) {
    if (!project) return;
    setDeletingStepId(stepId);
    const updatedSteps = (project.next_steps ?? []).filter((s) => s.id !== stepId);
    setProject((prev) => prev ? { ...prev, next_steps: updatedSteps } : prev);
    try {
      await critSupabase
        .from('projects')
        .update({ next_steps: updatedSteps })
        .eq('project_id', projectId);
    } catch (err) {
      console.error('Failed to delete step:', err);
      loadProject();
    } finally {
      setDeletingStepId(null);
    }
  }

  async function addNextStep() {
    if (!newTaskText.trim() || !project) return;
    setAddingTask(true);
    const newStep: CritNextStep = {
      id: crypto.randomUUID(),
      text: newTaskText.trim(),
      completed: false,
    };
    const updatedSteps = [...(project.next_steps ?? []), newStep];
    setProject((prev) => prev ? { ...prev, next_steps: updatedSteps } : prev);
    setNewTaskText('');
    try {
      await critSupabase
        .from('projects')
        .update({ next_steps: updatedSteps })
        .eq('project_id', projectId);
    } catch (err) {
      console.error('Failed to add step:', err);
    } finally {
      setAddingTask(false);
    }
  }

  function copyForAgent() {
    if (!project) return;
    const uncompleted = (project.next_steps ?? []).filter((s) => !s.completed);
    const lines = uncompleted.map((s) => `- [ ] ${s.text}`).join('\n');
    const markdown = `### Prototype Review Action Items

The following feedback items were flagged during design review for ${project.title || project.project_id}:

${lines}

Please update the codebase to resolve these issues.`;
    navigator.clipboard.writeText(markdown);
    showToast('Copied prompt for AI agent!');
  }

  function copyPasscode() {
    if (!project?.creator_password) return;
    navigator.clipboard.writeText(project.creator_password);
    setCopiedPasscode(true);
    setTimeout(() => setCopiedPasscode(false), 2000);
    showToast('Passcode copied!');
  }

  const epics = useMemo<CritEpic[]>(() => project?.epics ?? [], [project]);

  const filteredFeedback = useMemo(() => {
    if (activeEpicId === 'all') return feedback;
    return feedback.filter((f) => f.epic_id === activeEpicId);
  }, [feedback, activeEpicId]);

  function copyEpicShareLink(epic: CritEpic) {
    if (!epic.target_url) {
      showToast('No prototype URL set for this epic');
      return;
    }
    const separator = epic.target_url.includes('?') ? '&' : '?';
    const link = `${epic.target_url}${separator}crit_epic=${epic.slug}`;
    navigator.clipboard.writeText(link);
    setCopiedEpicId(epic.id);
    setTimeout(() => setCopiedEpicId(null), 2000);
    showToast('Epic share link copied!');
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900">Project not found</h2>
          <button onClick={onBack} className="mt-4 text-sm text-violet-600 hover:text-violet-700 font-medium">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const openNextSteps = (project.next_steps ?? []).filter((s) => !s.completed).length;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-slide-in-right">
          <Check className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-3 z-10">
        <button onClick={onBack} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="min-w-0">
          <h1 className="text-base font-bold text-slate-900 truncate">{project.title || project.project_id}</h1>
          <p className="text-xs text-slate-400 font-mono">{project.project_id}</p>
        </div>
        {project.is_published ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Published
          </span>
        ) : (
          <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" /> Draft
          </span>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 p-5 max-w-[1400px] mx-auto">
        {/* Left Panel - 40% */}
        <div className="lg:w-[40%] space-y-4">
          {/* Video Preview */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Play className="w-4 h-4 text-violet-500" />
                Walkthrough Video
              </h3>
            </div>
            {project.walkthrough_url ? (
              <div className="relative aspect-video bg-slate-900 flex items-center justify-center group">
                <video
                  src={project.walkthrough_url}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center">
                <Video className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No walkthrough video yet</p>
                <p className="text-xs text-slate-400 mt-1">Record one via Creator Mode</p>
              </div>
            )}
          </div>

          {/* Creator Passcode */}
          {project.creator_password && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center shrink-0">
                  <KeyRound className="w-4.5 h-4.5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Creator Passcode</p>
                  <p className="text-sm font-mono font-semibold text-slate-900 mt-0.5 truncate">{project.creator_password}</p>
                </div>
                <button
                  onClick={copyPasscode}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-700 hover:text-violet-900 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-lg transition-all shrink-0"
                >
                  {copiedPasscode ? (
                    <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" /> Copy Passcode</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Creator Notes */}
          {project.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-semibold text-amber-900">Creator Notes</h3>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">{project.notes}</p>
            </div>
          )}

          {/* Questions */}
          {project.questions && project.questions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-500" />
                  Feedback Questions
                </h3>
              </div>
              <div className="p-4 space-y-3">
                {project.questions.map((q, i) => {
                  const totalVotes = filteredFeedback.filter((f) => f.type === 'poll').length;
                  const votePct = totalVotes > 0 ? Math.round(((q.poll_votes ?? 0) / totalVotes) * 100) : 0;
                  return (
                    <div key={q.id || i}>
                      <p className="text-sm text-slate-700 font-medium mb-1.5">{q.text}</p>
                      {(q.poll_votes ?? 0) > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${votePct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 font-medium tabular-nums">{votePct}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - 60% */}
        <div className="lg:w-[60%] bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Epic Tab Switcher */}
          {activeTab === 'feedback' && epics.length > 0 && (
            <div className="flex items-center gap-1 px-3 pt-3 border-b border-slate-100 overflow-x-auto">
              <button
                onClick={() => setActiveEpicId('all')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                  activeEpicId === 'all'
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                All Feedback
                {feedback.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    activeEpicId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>{feedback.length}</span>
                )}
              </button>
              {epics.map((epic) => {
                const epicCount = feedback.filter((f) => f.epic_id === epic.id).length;
                const isActive = activeEpicId === epic.id;
                const isCopied = copiedEpicId === epic.id;
                return (
                  <div
                    key={epic.id}
                    className={`flex items-center gap-1 rounded-lg transition-all whitespace-nowrap ${
                      isActive ? 'bg-violet-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => setActiveEpicId(epic.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {epic.name}
                      {epicCount > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>{epicCount}</span>
                      )}
                    </button>
                    <button
                      onClick={() => copyEpicShareLink(epic)}
                      title="Copy Epic Share Link"
                      className={`p-1.5 rounded-md transition-all shrink-0 ${
                        isActive
                          ? 'text-violet-200 hover:text-white hover:bg-white/10'
                          : 'text-slate-400 hover:text-violet-600 hover:bg-violet-50'
                      }`}
                    >
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Link2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'feedback' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Feedback
              {filteredFeedback.length > 0 && (
                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">{filteredFeedback.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('next-steps')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === 'next-steps' ? 'border-violet-600 text-violet-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Next Steps
              {openNextSteps > 0 && (
                <span className="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-semibold">{openNextSteps}</span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'feedback' && (
              <FeedbackTab feedback={filteredFeedback} activeEpicId={activeEpicId} epics={epics} />
            )}
            {activeTab === 'next-steps' && (
              <NextStepsTab
                project={project}
                togglingId={togglingId}
                onToggle={toggleNextStep}
                onDelete={deleteNextStep}
                deletingStepId={deletingStepId}
                newTaskText={newTaskText}
                setNewTaskText={setNewTaskText}
                onAdd={addNextStep}
                addingTask={addingTask}
                onCopyForAgent={copyForAgent}
                openCount={openNextSteps}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeedbackTab({ feedback, activeEpicId, epics }: {
  feedback: CritFeedback[];
  activeEpicId: string;
  epics: CritEpic[];
}) {
  const activeEpic = activeEpicId !== 'all' ? epics.find((e) => e.id === activeEpicId) : undefined;

  if (feedback.length === 0) {
    return (
      <div className="text-center py-16 px-6">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-7 h-7 text-slate-400" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          {activeEpic ? `No feedback for ${activeEpic.name}` : 'No feedback recorded yet'}
        </h3>
        <p className="text-sm text-slate-500">
          {activeEpic ? 'Share the epic link to collect responses for this area.' : 'Share your prototype link to collect responses.'}
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-50">
      {feedback.map((item) => {
        const itemEpic = item.epic_id ? epics.find((e) => e.id === item.epic_id) : undefined;
        return (
          <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-start gap-3">
              {item.avatar_url ? (
                <img src={item.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                  {(item.reviewer_name || '?')[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-900">{item.reviewer_name || 'Anonymous'}</span>
                  {itemEpic && activeEpicId === 'all' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md">
                      <Layers className="w-2.5 h-2.5" />
                      {itemEpic.name}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{timeAgo(item.created_at)}</span>
                </div>
                {item.element_selector && (
                  <div className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md mb-2">
                    <Code2 className="w-3 h-3" />
                    {item.element_selector}
                  </div>
                )}
                {item.type === 'video' && item.video_url ? (
                  <div className="mt-2 rounded-lg overflow-hidden bg-slate-900 max-w-sm">
                    <video src={item.video_url} controls className="w-full" />
                  </div>
                ) : (
                  item.text_content && (
                    <p className="text-sm text-slate-600 leading-relaxed">{item.text_content}</p>
                  )
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NextStepsTab({
  project, togglingId, onToggle, onDelete, deletingStepId, newTaskText, setNewTaskText, onAdd, addingTask, onCopyForAgent, openCount,
}: {
  project: CritProject;
  togglingId: string | null;
  onToggle: (step: CritNextStep) => void;
  onDelete: (stepId: string) => void;
  deletingStepId: string | null;
  newTaskText: string;
  setNewTaskText: (v: string) => void;
  onAdd: () => void;
  addingTask: boolean;
  onCopyForAgent: () => void;
  openCount: number;
}) {
  const steps = project.next_steps ?? [];
  return (
    <div className="p-4 space-y-3">
      {steps.length === 0 && !newTaskText && (
        <div className="text-center py-10">
          <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No action items yet. Add tasks below.</p>
        </div>
      )}

      {steps.map((step) => (
        <div
          key={step.id}
          className="group flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors"
        >
          <button
            onClick={() => onToggle(step)}
            disabled={togglingId === step.id}
            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
              step.completed
                ? 'bg-violet-600 border-violet-600'
                : 'border-slate-300 hover:border-violet-400'
            }`}
          >
            {togglingId === step.id ? (
              <Loader2 className="w-3 h-3 text-white animate-spin" />
            ) : step.completed ? (
              <Check className="w-3.5 h-3.5 text-white" />
            ) : null}
          </button>
          <span className={`text-sm leading-relaxed flex-1 ${step.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
            {step.text}
          </span>
          <button
            onClick={() => onDelete(step.id)}
            disabled={deletingStepId === step.id}
            className="opacity-0 group-hover:opacity-100 mt-0.5 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
          >
            {deletingStepId === step.id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      ))}

      <div className="flex items-center gap-2 pt-1">
        <input
          type="text"
          value={newTaskText}
          onChange={(e) => setNewTaskText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !addingTask) onAdd(); }}
          placeholder="Add a new action item..."
          className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
        />
        <button
          onClick={onAdd}
          disabled={addingTask || !newTaskText.trim()}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-medium px-3 py-2.5 rounded-lg transition-all text-sm"
        >
          {addingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </div>

      <div className="pt-3 border-t border-slate-100">
        <button
          onClick={onCopyForAgent}
          disabled={openCount === 0}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm"
        >
          <Code2 className="w-4 h-4" />
          Copy for Agent
          {openCount > 0 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">{openCount}</span>}
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">
          Copies uncompleted items as a markdown prompt for AI coding agents.
        </p>
      </div>
    </div>
  );
}
