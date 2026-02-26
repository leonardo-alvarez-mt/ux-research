import { useEffect, useState } from 'react';
import { Archive, Loader2, ClipboardList } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchSessions, fetchTasksBySession, archiveSession, deleteSession } from '../lib/data';
import type { Session, Task } from '../lib/types';
import SessionCard from '../components/SessionCard';

interface ArchivePageProps {
  onViewSession: (id: string) => void;
}

interface SessionWithStats {
  session: Session;
  completedCount: number;
  totalCount: number;
}

export default function ArchivePage({ onViewSession }: ArchivePageProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadSessions();
  }, [user]);

  async function loadSessions() {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchSessions(user.id, true);
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
    } finally {
      setLoading(false);
    }
  }

  async function handleUnarchive(id: string) {
    await archiveSession(id, false);
    setSessions((prev) => prev.filter((s) => s.session.id !== id));
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this session? This cannot be undone.')) return;
    await deleteSession(id);
    setSessions((prev) => prev.filter((s) => s.session.id !== id));
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
            <Archive className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Archive</h1>
            <p className="text-slate-500 text-sm">Archived sessions — click the archive icon to restore</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
              <ClipboardList className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-slate-900 font-semibold text-base mb-2">No archived sessions</h3>
            <p className="text-slate-500 text-sm max-w-xs">
              Sessions you archive from the dashboard will appear here.
            </p>
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
                onArchive={handleUnarchive}
                onDelete={handleDelete}
                showUnarchive
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
