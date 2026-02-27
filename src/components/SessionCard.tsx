import { CalendarDays, ChevronRight, Archive, Trash2, Users } from 'lucide-react';
import type { Session } from '../lib/types';

interface SessionCardProps {
  session: Session;
  completedCount: number;
  totalCount: number;
  onView: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  showUnarchive?: boolean;
  isShared?: boolean;
}

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

export default function SessionCard({
  session,
  completedCount,
  totalCount,
  onView,
  onArchive,
  onDelete,
  showUnarchive = false,
  isShared = false,
}: SessionCardProps) {
  const daysRemaining = getDaysRemaining(session.test_date);
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const isCwg = session.session_type === 'client_working_group';

  const badgeClass =
    progress === 100
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : daysRemaining < 0
      ? 'bg-red-100 text-red-700 border-red-200'
      : daysRemaining <= 7
      ? 'bg-amber-100 text-amber-700 border-amber-200'
      : isCwg
      ? 'bg-teal-100 text-teal-700 border-teal-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';

  const badgeLabel =
    progress === 100
      ? 'Completed'
      : daysRemaining < 0
      ? `${Math.abs(daysRemaining)}d Overdue`
      : daysRemaining === 0
      ? 'Today!'
      : `${daysRemaining}d remaining`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            {isShared && (
              <div className="flex items-center gap-1 text-xs text-sky-600 font-semibold mb-1">
                <Users className="w-3 h-3" />
                Shared with me
              </div>
            )}
            {isCwg && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full mb-1">
                <Users className="w-3 h-3" />
                CWG
              </span>
            )}
          <h3
              className={`font-semibold text-slate-900 text-sm leading-snug cursor-pointer transition-colors ${isCwg ? 'hover:text-teal-600' : 'hover:text-blue-600'}`}
              onClick={() => onView(session.id)}
            >
              {session.name}
            </h3>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap shrink-0 ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>

        {session.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{session.description}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
          <CalendarDays className="w-3.5 h-3.5" />
          <span>{isCwg ? 'Meeting Date' : 'Test Date'}: {formatDate(session.test_date)}</span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Progress</span>
            <span className="font-semibold text-slate-700">
              {completedCount}/{totalCount} tasks
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress === 100
                  ? 'bg-emerald-500'
                  : isCwg
                  ? progress > 50 ? 'bg-teal-500' : 'bg-teal-400'
                  : progress > 50 ? 'bg-blue-500' : 'bg-blue-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400">{progress}% complete</p>
        </div>
      </div>

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {!isShared && (
            <>
              <button
                onClick={() => onArchive(session.id)}
                title={showUnarchive ? 'Restore session' : 'Archive session'}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition-colors"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(session.id)}
                title="Delete session"
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
        <button
          onClick={() => onView(session.id)}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors text-blue-600 hover:text-blue-700"
        >
          View session
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
