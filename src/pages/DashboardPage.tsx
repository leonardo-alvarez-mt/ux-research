import { useEffect, useState } from 'react';
import { Plus, LayoutDashboard, Loader2, ClipboardList, Users, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchSessions,
  fetchTasksBySession,
  archiveSession,
  deleteSession,
  fetchSharedWithMeSessions,
  fetchSurveys,
  fetchSurveyResponses,
  createSurvey,
  deleteSurvey,
} from '../lib/data';
import type { SessionWithStats } from '../lib/data';
import type { Session, Task, SessionType, Survey } from '../lib/types';
import SessionCard from '../components/SessionCard';
import SurveyCard from '../components/SurveyCard';
import CreateSessionModal from '../components/CreateSessionModal';
import CreateCwgSessionModal from '../components/CreateCwgSessionModal';
import NewSessionMenu from '../components/NewSessionMenu';
import ComingSoonModal from '../components/ComingSoonModal';

type SessionsTab = 'mine' | 'shared';
type TypeFilter = 'all' | Exclude<SessionType, 'survey'> | 'survey';

interface DashboardPageProps {
  onViewSession: (id: string) => void;
  onViewSurvey: (id: string) => void;
  onViewSurveyResults?: (id: string) => void;
  refreshKey?: number;
}

export default function DashboardPage({ onViewSession, onViewSurvey, onViewSurveyResults, refreshKey }: DashboardPageProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [sharedSessions, setSharedSessions] = useState<SessionWithStats[]>([]);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyResponseCounts, setSurveyResponseCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCwgModal, setShowCwgModal] = useState(false);
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('usability_test');
  const [comingSoonType, setComingSoonType] = useState<SessionType | null>(null);
  const [activeTab, setActiveTab] = useState<SessionsTab>('mine');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  useEffect(() => {
    if (user) loadAll();
  }, [user, refreshKey]);

  async function loadAll() {
    if (!user) return;
    setLoading(true);
    try {
      const [data, shared, surveyList] = await Promise.all([
        fetchSessions(user.id, false),
        fetchSharedWithMeSessions(user.id),
        fetchSurveys(user.id),
      ]);

      const withStats = await Promise.all(
        data.map(async (session) => {
          const tasks: Task[] = await fetchTasksBySession(session.id);
          return {
            session,
            completedCount: tasks.filter((t) => t.is_completed).length,
            totalCount: tasks.length,
          };
        })
      );

      const responseCounts: Record<string, number> = {};
      await Promise.all(
        surveyList.map(async (s) => {
          const responses = await fetchSurveyResponses(s.id);
          responseCounts[s.id] = responses.length;
        })
      );

      setSessions(withStats);
      setSharedSessions(shared);
      setSurveys(surveyList);
      setSurveyResponseCounts(responseCounts);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive(id: string) {
    await archiveSession(id, true);
    setSessions((prev) => prev.filter((s) => s.session.id !== id));
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this session and all its tasks? This cannot be undone.')) return;
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.session.id !== id));
  }

  async function handleDeleteSurvey(id: string) {
    if (!confirm('Delete this survey and all its responses? This cannot be undone.')) return;
    await deleteSurvey(id);
    setSurveys((prev) => prev.filter((s) => s.id !== id));
  }

  function handleCreated(session: Session) {
    setShowModal(false);
    onViewSession(session.id);
  }

  async function handleMenuSelect(type: SessionType) {
    if (type === 'usability_test') {
      setSelectedSessionType(type);
      setShowModal(true);
    } else if (type === 'survey') {
      if (!user) return;
      const newSurvey = await createSurvey(user.id);
      onViewSurvey(newSurvey.id);
    } else if (type === 'client_working_group') {
      setShowCwgModal(true);
    } else {
      setComingSoonType(type);
    }
  }

  const activeSessions = sessions.filter((s) => !s.session.is_archived);

  const filteredSessions = typeFilter === 'all'
    ? activeSessions
    : typeFilter === 'survey'
    ? []
    : activeSessions.filter((s) => s.session.session_type === typeFilter);

  const showSurveys = typeFilter === 'all' || typeFilter === 'survey';
  const showRegularSessions = typeFilter === 'all' || typeFilter !== 'survey';

  const totalItems = activeSessions.length + surveys.length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
              <p className="text-slate-500 text-sm">
                {activeSessions.length} active {activeSessions.length === 1 ? 'session' : 'sessions'} &middot; {surveys.length} {surveys.length === 1 ? 'survey' : 'surveys'}
              </p>
            </div>
          </div>
          <NewSessionMenu onSelect={handleMenuSelect} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Sessions" value={activeSessions.length} color="blue" />
          <StatCard
            label="Completed Tasks"
            value={activeSessions.reduce((sum, s) => sum + s.completedCount, 0)}
            color="emerald"
          />
          <StatCard label="Surveys" value={surveys.length} color="violet" />
          <StatCard
            label="Survey Responses"
            value={Object.values(surveyResponseCounts).reduce((s, n) => s + n, 0)}
            color="amber"
          />
        </div>

        {/* Tabs row */}
        <div className="mb-6">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-3">
            <button
              onClick={() => setActiveTab('mine')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'mine'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              My Work
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === 'mine' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>
                {totalItems}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'shared'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              Shared With Me
              {sharedSessions.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  activeTab === 'shared' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                }`}>
                  {sharedSessions.length}
                </span>
              )}
            </button>
          </div>

          {/* Type filters — only show for "mine" tab */}
          {activeTab === 'mine' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <FilterPill
                label="All"
                active={typeFilter === 'all'}
                onClick={() => setTypeFilter('all')}
              />
              <FilterPill
                label="Usability Test"
                active={typeFilter === 'usability_test'}
                onClick={() => setTypeFilter('usability_test')}
                icon={<ClipboardCheck className="w-3 h-3" />}
              />
              <FilterPill
                label="CWG"
                active={typeFilter === 'client_working_group'}
                onClick={() => setTypeFilter('client_working_group')}
                icon={<Users className="w-3 h-3" />}
                teal
              />
              <FilterPill
                label="Survey"
                active={typeFilter === 'survey'}
                onClick={() => setTypeFilter('survey')}
                icon={<ClipboardList className="w-3 h-3" />}
              />
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
          </div>
        ) : activeTab === 'mine' ? (
          <MyWorkGrid
            sessions={showRegularSessions ? filteredSessions : []}
            surveys={showSurveys ? surveys : []}
            surveyResponseCounts={surveyResponseCounts}
            onViewSession={onViewSession}
            onViewSurvey={onViewSurvey}
            onViewSurveyResults={onViewSurveyResults ?? onViewSurvey}
            onArchive={handleArchive}
            onDeleteSession={handleDelete}
            onDeleteSurvey={handleDeleteSurvey}
            typeFilter={typeFilter}
            onCreateFirst={() => setShowModal(true)}
          />
        ) : (
          sharedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-semibold text-base mb-2">No shared sessions yet</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                When someone invites you to collaborate on a session, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedSessions.map(({ session, completedCount, totalCount }) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  completedCount={completedCount}
                  totalCount={totalCount}
                  onView={onViewSession}
                  onArchive={() => {}}
                  onDelete={() => {}}
                  isShared
                />
              ))}
            </div>
          )
        )}
      </div>

      {showModal && (
        <CreateSessionModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          sessionType={selectedSessionType}
        />
      )}
      {showCwgModal && (
        <CreateCwgSessionModal
          onClose={() => setShowCwgModal(false)}
          onCreated={(session) => {
            setShowCwgModal(false);
            onViewSession(session.id);
          }}
        />
      )}
      {comingSoonType && (
        <ComingSoonModal
          sessionType={comingSoonType}
          onClose={() => setComingSoonType(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// MyWorkGrid
// ============================================================

interface MyWorkGridProps {
  sessions: SessionWithStats[];
  surveys: Survey[];
  surveyResponseCounts: Record<string, number>;
  onViewSession: (id: string) => void;
  onViewSurvey: (id: string) => void;
  onViewSurveyResults: (id: string) => void;
  onArchive: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onDeleteSurvey: (id: string) => void;
  typeFilter: TypeFilter;
  onCreateFirst: () => void;
}

function MyWorkGrid({
  sessions,
  surveys,
  surveyResponseCounts,
  onViewSession,
  onViewSurvey,
  onViewSurveyResults,
  onArchive,
  onDeleteSession,
  onDeleteSurvey,
  typeFilter,
  onCreateFirst,
}: MyWorkGridProps) {
  const hasSessions = sessions.length > 0;
  const hasSurveys = surveys.length > 0;
  const isEmpty = !hasSessions && !hasSurveys;

  if (isEmpty) {
    return <EmptyState filter={typeFilter} onCreate={onCreateFirst} />;
  }

  return (
    <div className="space-y-8">
      {hasSessions && (
        <section>
          {typeFilter === 'all' && (
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Sessions</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(({ session, completedCount, totalCount }) => (
              <SessionCard
                key={session.id}
                session={session}
                completedCount={completedCount}
                totalCount={totalCount}
                onView={onViewSession}
                onArchive={onArchive}
                onDelete={onDeleteSession}
              />
            ))}
          </div>
        </section>
      )}

      {hasSurveys && (
        <section>
          {typeFilter === 'all' && (
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Surveys</h2>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveys.map((survey) => (
              <SurveyCard
                key={survey.id}
                survey={survey}
                responseCount={surveyResponseCounts[survey.id] ?? 0}
                onEdit={onViewSurvey}
                onResults={onViewSurveyResults}
                onDelete={onDeleteSurvey}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// Filter Pill
// ============================================================

function FilterPill({
  label,
  active,
  onClick,
  icon,
  teal,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  teal?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active
          ? teal
            ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
            : 'bg-slate-900 text-white border-slate-900 shadow-sm'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ============================================================
// Stat Card
// ============================================================

function StatCard({ label, value }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 shadow-sm">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ============================================================
// Empty State
// ============================================================

function EmptyState({ filter, onCreate }: { filter: TypeFilter; onCreate: () => void }) {
  if (filter === 'survey') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <ClipboardList className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-slate-900 font-semibold text-base mb-2">No surveys yet</h3>
        <p className="text-slate-500 text-sm max-w-xs">
          Create your first survey from the "New Session" menu above.
        </p>
      </div>
    );
  }

  if (filter === 'client_working_group') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-4">
          <Users className="w-8 h-8 text-teal-400" />
        </div>
        <h3 className="text-slate-900 font-semibold text-base mb-2">No CWG sessions yet</h3>
        <p className="text-slate-500 text-sm max-w-xs mb-6">
          Create your first Client Working Group session. Target 3-5 consistent participants per group.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
        <ClipboardList className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-slate-900 font-semibold text-base mb-2">No sessions yet</h3>
      <p className="text-slate-500 text-sm max-w-xs mb-6">
        Create your first usability session to automatically generate a full 40-task checklist.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
      >
        <Plus className="w-4 h-4" />
        Create Your First Session
      </button>
    </div>
  );
}
