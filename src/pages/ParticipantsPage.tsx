import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  UserPlus,
  Users,
  Loader2,
  AlertCircle,
  ChevronRight,
  X,
  Edit2,
  Trash2,
  Mail,
  Building2,
  UserCheck,
  FileText,
  Calendar,
  Clock,
  Check,
  AlertTriangle,
  Package,
  Star,
} from 'lucide-react';
import {
  fetchParticipantsWithSessionCount,
  createParticipant,
  updateParticipant,
  deleteParticipant,
  fetchParticipantSessions,
  updateSessionEngagement,
} from '../lib/data';
import { useAuth } from '../context/AuthContext';
import type { ParticipantWithSessionCount, ParticipantSessionEntry } from '../lib/types';
import { STATUS_STYLES } from '../lib/types';

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const CUSTOMER_TYPES = [
  { value: 'new', label: 'New Customer' },
  { value: 'established', label: 'Established Customer' },
];

const ENGAGEMENT_OPTIONS: { value: string; label: string; dot: string; bg: string; text: string }[] = [
  { value: 'green', label: 'High', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  { value: 'yellow', label: 'Medium', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  { value: 'red', label: 'Low', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
];

function engagementStyle(value: string | null) {
  return ENGAGEMENT_OPTIONS.find((o) => o.value === value) ?? null;
}

interface ParticipantFormState {
  name: string;
  email: string;
  client: string;
  account_manager: string;
  product: string;
  customer_type: string;
  notes: string;
}

const emptyForm: ParticipantFormState = {
  name: '',
  email: '',
  client: '',
  account_manager: '',
  product: '',
  customer_type: 'new',
  notes: '',
};

function participantToForm(p: ParticipantWithSessionCount): ParticipantFormState {
  return {
    name: p.name,
    email: p.email,
    client: p.client,
    account_manager: p.account_manager,
    product: p.product,
    customer_type: p.customer_type || 'new',
    notes: p.notes,
  };
}

type PanelView = 'detail' | 'edit' | 'delete-confirm';

function EngagementPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {ENGAGEMENT_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? null : opt.value)}
          title={opt.label + ' engagement'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            value === opt.value
              ? `${opt.bg} ${opt.text} border-current`
              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
          {opt.label}
        </button>
      ))}
    </div>
  );
}

interface SlideOverPanelProps {
  participant: ParticipantWithSessionCount | null;
  panelView: PanelView;
  onClose: () => void;
  onUpdated: (p: ParticipantWithSessionCount) => void;
  onDeleted: (id: string) => void;
  onSetPanelView: (v: PanelView) => void;
}

function SlideOverPanel({
  participant,
  panelView,
  onClose,
  onUpdated,
  onDeleted,
  onSetPanelView,
}: SlideOverPanelProps) {
  const [form, setForm] = useState<ParticipantFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<ParticipantSessionEntry[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [engagementUpdating, setEngagementUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (participant) {
      setForm(participantToForm(participant));
      if (panelView === 'detail') {
        setSessionsLoading(true);
        fetchParticipantSessions(participant.id)
          .then(setSessions)
          .catch(() => setSessions([]))
          .finally(() => setSessionsLoading(false));
      }
    }
  }, [participant, panelView]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!participant) return;
    setError('');
    setSaving(true);
    try {
      const updated = await updateParticipant(participant.id, form);
      onUpdated({ ...updated, session_count: participant.session_count });
      onSetPanelView('detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!participant) return;
    setDeleting(true);
    try {
      await deleteParticipant(participant.id);
      onDeleted(participant.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete participant.');
      setDeleting(false);
    }
  }

  async function handleEngagementChange(sessionParticipantId: string, value: string | null) {
    setEngagementUpdating(sessionParticipantId);
    try {
      await updateSessionEngagement(sessionParticipantId, value);
      setSessions((prev) =>
        prev.map((s) =>
          s.session_participant_id === sessionParticipantId ? { ...s, engagement: value } : s
        )
      );
    } catch {
    } finally {
      setEngagementUpdating(null);
    }
  }

  if (!participant) return null;

  const customerLabel = CUSTOMER_TYPES.find((c) => c.value === (participant.customer_type || 'new'))?.label ?? 'New Customer';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-40 flex flex-col overflow-hidden animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <span className="text-blue-700 font-bold text-sm">{getInitials(participant.name)}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-slate-900 font-semibold text-base truncate">{participant.name}</h2>
              <p className="text-slate-500 text-xs truncate">{participant.email || 'No email'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {panelView === 'detail' && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Profile</span>
                <button
                  onClick={() => onSetPanelView('edit')}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>

              <div className="space-y-3">
                {participant.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Email</p>
                      <p className="text-sm text-slate-800 font-medium">{participant.email}</p>
                    </div>
                  </div>
                )}
                {participant.client && (
                  <div className="flex items-start gap-3">
                    <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Client</p>
                      <p className="text-sm text-slate-800 font-medium">{participant.client}</p>
                    </div>
                  </div>
                )}
                {participant.account_manager && (
                  <div className="flex items-start gap-3">
                    <UserCheck className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Account Manager</p>
                      <p className="text-sm text-slate-800 font-medium">{participant.account_manager}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Package className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Product</p>
                    <p className="text-sm text-slate-800 font-medium">{participant.product || '—'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Star className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Customer Type</p>
                    <span
                      className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full mt-0.5 ${
                        (participant.customer_type || 'new') === 'established'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {customerLabel}
                    </span>
                  </div>
                </div>

                {participant.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Notes</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{participant.notes}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Session History
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                    {participant.session_count} session{participant.session_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {sessionsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="w-7 h-7 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No sessions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((s) => {
                      const eng = engagementStyle(s.engagement);
                      return (
                        <div
                          key={s.session_participant_id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate">{s.session_name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(s.test_date)}
                                </div>
                                {s.slot && (
                                  <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <Clock className="w-3 h-3" />
                                    {s.slot}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 capitalize ${
                                STATUS_STYLES[s.status] ?? 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-slate-400 font-medium">Engagement</span>
                            {engagementUpdating === s.session_participant_id ? (
                              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                            ) : (
                              <EngagementPicker
                                value={s.engagement}
                                onChange={(v) => handleEngagementChange(s.session_participant_id, v)}
                              />
                            )}
                          </div>

                          {eng && (
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${eng.text} ${eng.bg} px-2.5 py-1 rounded-lg w-fit`}>
                              <span className={`w-2 h-2 rounded-full ${eng.dot}`} />
                              {eng.label} Engagement
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6">
              <button
                onClick={() => onSetPanelView('delete-confirm')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Participant
              </button>
            </div>
          </div>
        )}

        {panelView === 'edit' && (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1 px-6 py-5 space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Edit Profile</p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Client</label>
                  <input
                    type="text"
                    value={form.client}
                    onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Account Manager</label>
                  <input
                    type="text"
                    value={form.account_manager}
                    onChange={(e) => setForm((f) => ({ ...f, account_manager: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Product</label>
                <input
                  type="text"
                  value={form.product}
                  onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                  placeholder="e.g. TeamConnect, PolicyHub..."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Customer Type</label>
                <div className="flex gap-2">
                  {CUSTOMER_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, customer_type: ct.value }))}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        form.customer_type === ct.value
                          ? ct.value === 'established'
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => { setError(''); onSetPanelView('detail'); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {panelView === 'delete-confirm' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-slate-900 font-semibold text-lg mb-2">Delete Participant?</h3>
            <p className="text-slate-500 text-sm mb-1">
              This will permanently delete <strong>{participant.name}</strong> and remove them from all sessions.
            </p>
            <p className="text-slate-400 text-xs mb-8">This action cannot be undone.</p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 w-full text-left">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={() => { setError(''); onSetPanelView('detail'); }}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

interface CreatePanelProps {
  userId: string;
  onClose: () => void;
  onCreated: (p: ParticipantWithSessionCount) => void;
}

function CreatePanel({ userId, onClose, onCreated }: CreatePanelProps) {
  const [form, setForm] = useState<ParticipantFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const created = await createParticipant(userId, form);
      onCreated({ ...created, session_count: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create participant.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-40 flex flex-col overflow-hidden animate-slide-in-right">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-slate-900 font-semibold text-base">New Participant</h2>
              <p className="text-slate-500 text-xs">Add to your roster</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Aaron Blazevic"
                required
                autoFocus
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="ablazevic@example.com"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Client</label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                  placeholder="Beal Service Corp."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Account Manager</label>
                <input
                  type="text"
                  value={form.account_manager}
                  onChange={(e) => setForm((f) => ({ ...f, account_manager: e.target.value }))}
                  placeholder="Kristyn Lashbrook"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Product</label>
              <input
                type="text"
                value={form.product}
                onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))}
                placeholder="e.g. TeamConnect, PolicyHub..."
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Customer Type</label>
              <div className="flex gap-2">
                {CUSTOMER_TYPES.map((ct) => (
                  <button
                    key={ct.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, customer_type: ct.value }))}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      form.customer_type === ct.value
                        ? ct.value === 'established'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {ct.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any relevant notes about this participant..."
                rows={3}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-none"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Participant'
              )}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}

export default function ParticipantsPage() {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<ParticipantWithSessionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantWithSessionCount | null>(null);
  const [panelView, setPanelView] = useState<PanelView>('detail');
  const [showCreate, setShowCreate] = useState(false);

  const loadParticipants = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchParticipantsWithSessionCount(user.id);
      setParticipants(data);
    } catch {
      setError('Failed to load participants. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const filtered = participants.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q) ||
      p.account_manager.toLowerCase().includes(q) ||
      p.product.toLowerCase().includes(q)
    );
  });

  function handleSelectParticipant(p: ParticipantWithSessionCount) {
    setSelectedParticipant(p);
    setPanelView('detail');
    setShowCreate(false);
  }

  function handleClosePanel() {
    setSelectedParticipant(null);
  }

  function handleUpdated(updated: ParticipantWithSessionCount) {
    setParticipants((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setSelectedParticipant(updated);
  }

  function handleDeleted(id: string) {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
    setSelectedParticipant(null);
  }

  function handleCreated(created: ParticipantWithSessionCount) {
    setParticipants((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
    );
    setShowCreate(false);
    setSelectedParticipant(created);
    setPanelView('detail');
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Participant Roster</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} in your roster
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setSelectedParticipant(null); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm shadow-sm shadow-blue-900/20 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Add Participant
          </button>
        </div>

        <div className="relative mb-5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, client, account manager, or product..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm placeholder:text-slate-400"
          />
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
          </div>
        ) : participants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-slate-800 font-semibold text-lg mb-1">No participants yet</h3>
            <p className="text-slate-400 text-sm mb-6 max-w-xs">
              Build your roster by adding participants. They can then be assigned to test sessions.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add First Participant
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="w-8 h-8 text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">No participants match your search.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="hidden lg:grid grid-cols-[auto_1fr_1fr_1fr_1fr_auto_auto] items-center px-5 py-3 border-b border-slate-100 bg-slate-50/80">
              <div className="w-9" />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide pl-3">Name</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Client</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Product</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Type</p>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide text-center">Sessions</p>
              <div className="w-6" />
            </div>

            <ul className="divide-y divide-slate-100">
              {filtered.map((p) => {
                const custLabel = CUSTOMER_TYPES.find((c) => c.value === (p.customer_type || 'new'))?.label ?? 'New';
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => handleSelectParticipant(p)}
                      className={`w-full flex items-center gap-3 px-5 py-4 hover:bg-blue-50/50 transition-colors text-left group ${
                        selectedParticipant?.id === p.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-blue-700 font-bold text-xs">{getInitials(p.name)}</span>
                      </div>

                      <div className="flex-1 min-w-0 lg:grid lg:grid-cols-4 lg:gap-4 lg:items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate">{p.email || '—'}</p>
                        </div>
                        <p className="hidden lg:block text-sm text-slate-600 truncate">{p.client || '—'}</p>
                        <p className="hidden lg:block text-sm text-slate-600 truncate">{p.product || '—'}</p>
                        <div className="hidden lg:flex">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              (p.customer_type || 'new') === 'established'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {custLabel}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-3">
                        <span className="hidden lg:inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-600 rounded-full text-xs font-semibold">
                          {p.session_count}
                        </span>
                        <span className="lg:hidden text-xs text-slate-400 font-medium">
                          {p.session_count} session{p.session_count !== 1 ? 's' : ''}
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {selectedParticipant && !showCreate && (
        <SlideOverPanel
          participant={selectedParticipant}
          panelView={panelView}
          onClose={handleClosePanel}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
          onSetPanelView={setPanelView}
        />
      )}

      {showCreate && user && (
        <CreatePanel
          userId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
