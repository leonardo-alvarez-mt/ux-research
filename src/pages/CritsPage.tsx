import { useEffect, useState, useRef } from 'react';
import { Layers, Plus, MoreHorizontal, ExternalLink, Copy, LayoutDashboard, Check, Loader2 } from 'lucide-react';
import { critSupabase } from '../lib/critSupabase';
import type { CritProject, CritFeedback } from '../types/crit';
import NewCritModal from '../components/NewCritModal';

interface CritsPageProps {
  onOpenDetail: (projectId: string) => void;
  refreshKey?: number;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function CritsPage({ onOpenDetail, refreshKey }: CritsPageProps) {
  const [projects, setProjects] = useState<CritProject[]>([]);
  const [feedbackCounts, setFeedbackCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
  }, [refreshKey]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadProjects() {
    setLoading(true);
    try {
      const { data, error } = await critSupabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const projectList = (data ?? []) as unknown as CritProject[];
      setProjects(projectList);

      const counts: Record<string, number> = {};
      await Promise.all(
        projectList.map(async (p) => {
          const { count } = await critSupabase
            .from('feedback')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', p.project_id);
          counts[p.id] = count ?? 0;
        })
      );
      setFeedbackCounts(counts);
    } catch (err) {
      console.error('Failed to load crit projects:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopySnippet(projectKey: string, projectId: string) {
    await navigator.clipboard.writeText(`npx get-crit ${projectKey}`);
    setCopiedId(projectId);
    setTimeout(() => setCopiedId(null), 2000);
    setOpenMenuId(null);
  }

  const activeCritis = projects.filter((p) => p.is_published).length;
  const totalResponses = Object.values(feedbackCounts).reduce((s, n) => s + n, 0);
  const openNextSteps = projects.reduce(
    (sum, p) => sum + (p.next_steps?.filter((s) => !s.completed).length ?? 0),
    0
  );

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Design Crits</h1>
              <p className="text-slate-500 text-sm">
                Manage prototype walkthroughs, collect structured feedback, and sync next steps.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Crit
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Active Crits" value={loading ? null : activeCritis} color="violet" icon={<Layers className="w-4 h-4" />} />
          <StatCard label="Total Responses" value={loading ? null : totalResponses} color="blue" icon={<Check className="w-4 h-4" />} />
          <StatCard label="Open Next Steps" value={loading ? null : openNextSteps} color="amber" icon={<LayoutDashboard className="w-4 h-4" />} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">All Projects</h2>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-5 bg-slate-100 rounded w-40" />
                  <div className="h-5 bg-slate-100 rounded w-20" />
                  <div className="h-5 bg-slate-100 rounded w-16" />
                  <div className="h-5 bg-slate-100 rounded w-24 ml-auto" />
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Layers className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">No design crits yet</h3>
              <p className="text-sm text-slate-500 mb-5">Create your first crit to start collecting feedback.</p>
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                New Crit
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-2.5">Project</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-2.5">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-2.5">Responses</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-2.5">Created</th>
                    <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wide px-5 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr
                      key={project.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer"
                      onClick={() => onOpenDetail(project.project_id)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-sm text-slate-900">{project.title || project.project_id}</div>
                        <div className="text-xs text-slate-400 font-mono">{project.project_id}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        {project.is_published ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-700 font-medium">{feedbackCounts[project.id] ?? 0}</span>
                        <span className="text-xs text-slate-400 ml-1">responses</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-slate-500">{timeAgo(project.created_at)}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="relative inline-block" ref={openMenuId === project.id ? menuRef : undefined}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === project.id ? null : project.id)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                          {openMenuId === project.id && (
                            <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-20">
                              {project.walkthrough_url && (
                                <a
                                  href={`${project.walkthrough_url}?crit_mode=creator`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setOpenMenuId(null)}
                                  className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                                  Open Creator Mode
                                </a>
                              )}
                              <button
                                onClick={() => handleCopySnippet(project.project_id, project.id)}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors w-full text-left"
                              >
                                {copiedId === project.id ? (
                                  <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied!</>
                                ) : (
                                  <><Copy className="w-3.5 h-3.5 text-slate-400" /> Copy Install Snippet</>
                                )}
                              </button>
                              <button
                                onClick={() => { onOpenDetail(project.project_id); setOpenMenuId(null); }}
                                className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors w-full text-left"
                              >
                                <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                                View Dashboard
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <NewCritModal
          onClose={() => setShowModal(false)}
          onCreated={(projectId) => {
            setShowModal(false);
            onOpenDetail(projectId);
          }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number | null; color: string; icon: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    violet: 'bg-violet-100 text-violet-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-slate-900">
        {value === null ? <Loader2 className="w-5 h-5 text-slate-300 animate-spin" /> : value}
      </div>
    </div>
  );
}
