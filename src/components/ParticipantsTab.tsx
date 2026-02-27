import { useEffect, useState } from 'react';
import {
  UserPlus,
  Users,
  Loader2,
  Trash2,
  ChevronDown,
  Mail,
  Building2,
  User,
  Clock,
} from 'lucide-react';
import {
  fetchSessionParticipants,
  updateSessionParticipantStatus,
  removeParticipantFromSession,
} from '../lib/data';
import type { SessionParticipantWithDetails } from '../lib/types';
import { PARTICIPANT_STATUSES, STATUS_STYLES } from '../lib/types';
import AddParticipantModal from './AddParticipantModal';

interface ParticipantsTabProps {
  sessionId: string;
  onCountChange?: (count: number) => void;
  readOnly?: boolean;
  isCwg?: boolean;
}

export default function ParticipantsTab({ sessionId, onCountChange, readOnly = false, isCwg = false }: ParticipantsTabProps) {
  const [sessionParticipants, setSessionParticipants] = useState<SessionParticipantWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [sessionId]);

  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await fetchSessionParticipants(sessionId);
      setSessionParticipants(data);
      onCountChange?.(data.length);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(spId: string, status: string) {
    setUpdatingId(spId);
    setSessionParticipants((prev) =>
      prev.map((sp) => (sp.id === spId ? { ...sp, status } : sp))
    );
    try {
      await updateSessionParticipantStatus(spId, status);
    } catch {
      load();
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleRemove(spId: string) {
    if (!confirm('Remove this participant from the session?')) return;
    setRemovingId(spId);
    try {
      await removeParticipantFromSession(spId);
      setSessionParticipants((prev) => {
        const updated = prev.filter((sp) => sp.id !== spId);
        onCountChange?.(updated.length);
        return updated;
      });
    } finally {
      setRemovingId(null);
    }
  }

  const alreadyAddedIds = new Set(sessionParticipants.map((sp) => sp.participant_id));

  const statusCounts = PARTICIPANT_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = sessionParticipants.filter((sp) => sp.status === s).length;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            {isCwg ? 'Attendees' : 'Participants'}
            <span className="ml-2 text-xs font-normal text-slate-400">
              ({sessionParticipants.length} total)
            </span>
          </h3>
          {sessionParticipants.length > 0 && (
            <div className="flex items-center gap-3 mt-1">
              {PARTICIPANT_STATUSES.map((s) => (
                <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[s]}`}>
                  {statusCounts[s]} {isCwg && s === 'completed' ? 'attended' : isCwg && s === 'no-show' ? 'absent' : s}
                </span>
              ))}
            </div>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-2 text-white font-semibold px-3.5 py-2 rounded-lg transition-colors text-xs shadow-sm ${isCwg ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {isCwg ? 'Add Attendee' : 'Add Participant'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      ) : loadError ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-red-100 rounded-xl">
          <p className="text-sm font-medium text-red-600 mb-1">Could not load participants</p>
          <button onClick={load} className="text-xs text-blue-600 hover:underline mt-1">Try again</button>
        </div>
      ) : sessionParticipants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
            <Users className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-1">No participants yet</p>
          <p className="text-xs text-slate-400 max-w-xs mb-4">
            {isCwg
              ? 'Add attendees to track who is joining this CWG session. Target 3-5 consistent participants.'
              : 'Add participants to track who is joining this usability session.'}
          </p>
          {!readOnly && (
            <button
              onClick={() => setShowModal(true)}
              className={`flex items-center gap-2 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-xs ${isCwg ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isCwg ? 'Add First Attendee' : 'Add First Participant'}
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Participant
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                  Client
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                  Account Manager
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">
                  {isCwg ? 'Role' : 'Slot'}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessionParticipants.map((sp) => {
                const p = sp.participant;
                const initials = p.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr key={sp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCwg ? 'bg-teal-100' : 'bg-blue-100'}`}>
                          <span className={`font-bold text-xs ${isCwg ? 'text-teal-700' : 'text-blue-700'}`}>{initials}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">{p.name}</p>
                          {p.email && (
                            <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 shrink-0" />
                              {p.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {p.client ? (
                        <span className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {p.client}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {p.account_manager ? (
                        <span className="flex items-center gap-1.5 text-xs text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {p.account_manager}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {sp.slot ? (
                        <span className="flex items-center gap-1 text-xs text-slate-600">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {sp.slot}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {readOnly ? (
                        <span className={`text-xs font-semibold px-2.5 py-1.5 rounded-full ${STATUS_STYLES[sp.status] ?? 'bg-slate-100 text-slate-600'}`}>
                          {isCwg && sp.status === 'completed' ? 'Attended' : isCwg && sp.status === 'no-show' ? 'Absent' : sp.status.charAt(0).toUpperCase() + sp.status.slice(1)}
                        </span>
                      ) : (
                        <div className="relative">
                          <select
                            value={sp.status}
                            onChange={(e) => handleStatusChange(sp.id, e.target.value)}
                            disabled={updatingId === sp.id}
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border-0 appearance-none cursor-pointer pr-6 focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                              STATUS_STYLES[sp.status] ?? 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {PARTICIPANT_STATUSES.map((s) => (
                              <option key={s} value={s} className="bg-white text-slate-900 font-normal">
                                {isCwg && s === 'completed' ? 'Attended' : isCwg && s === 'no-show' ? 'Absent' : s.charAt(0).toUpperCase() + s.slice(1)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-current opacity-70" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {!readOnly && (
                        <button
                          onClick={() => handleRemove(sp.id)}
                          disabled={removingId === sp.id}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          {removingId === sp.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AddParticipantModal
          sessionId={sessionId}
          alreadyAddedIds={alreadyAddedIds}
          onClose={() => setShowModal(false)}
          onAdded={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
