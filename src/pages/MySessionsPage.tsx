import { useEffect, useState } from 'react';
import { ListChecks, Loader2, ClipboardList, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSessions, fetchTasksBySession, archiveSession, deleteSession, fetchSharedWithMeSessions } from '../lib/data';
import type { SessionWithStats } from '../lib/data';
import type { Session, Task, SessionType } from '../lib/types';
import SessionCard from '../components/SessionCard';
import CreateSessionModal from '../components/CreateSessionModal';
import CreateCwgSessionModal from '../components/CreateCwgSessionModal';
import NewSessionMenu from '../components/NewSessionMenu';
import ComingSoonModal from '../components/ComingSoonModal';

type SessionsTab = 'mine' | 'shared';

interface MySessionsPageProps {
  onViewSession: (id: string) => void;
  refreshKey?: number;
}

export default function MySessionsPage({ onViewSession, refreshKey }: MySessionsPageProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [sharedSessions, setSharedSessions] = useState<SessionWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCwgModal, setShowCwgModal] = useState(false);
  const [selectedSessionType, setSelectedSessionType] = useState<SessionType>('usability_test');
  const [comingSoonType, setComingSoonType] = useState<SessionType | null>(null);
  const [activeTab, setActiveTab] = useState<SessionsTab>('mine');

  useEffect(() => {
    if (user) loadSessions();
  }, [user, refreshKey]);

  async function loadSessions() {
    if (!user) return;
    setLoading(true);
    try {
      const [data, shared] = await Promise.all([
        fetchSessions(user.id, false),
        fetchSharedWithMeSessions(user.id),
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
      setSessions(withStats);
      setSharedSessions(shared);
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

  function handleCreated(session: Session) {
    setShowModal(false);
    loadSessions();
  }

  function handleMenuSelect(type: SessionType) {
    if (type === 'usability_test') {
      setSelectedSessionType(type);
      setShowModal(true);
    } else if (type === 'client_working_group') {
      setShowCwgModal(true);
    } else {
      setComingSoonType(type);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Sessions</h1>
              <p className="text-slate-500 text-sm">All active usability study sessions</p>
            </div>
          </div>
          <NewSessionMenu onSelect={handleMenuSelect} />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'mine'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ListChecks className="w-4 h-4" />
            My Sessions
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === 'mine' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
            }`}>
              {sessions.length}
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

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
          </div>
        ) : activeTab === 'mine' ? (
          sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-semibold text-base mb-2">No active sessions</h3>
              <p className="text-slate-500 text-sm max-w-xs mb-6">
                All sessions may be archived. Create a new session to get started.
              </p>
              <NewSessionMenu onSelect={handleMenuSelect} />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map(({ session, completedCount, totalCount }) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  completedCount={completedCount}
                  totalCount={totalCount}
                  onView={onViewSession}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )
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
          onCreated={() => {
            setShowCwgModal(false);
            loadSessions();
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
