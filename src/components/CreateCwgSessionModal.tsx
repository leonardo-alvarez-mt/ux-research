import { useState } from 'react';
import { X, Users, Loader2, AlertCircle, Link, Globe, Lightbulb } from 'lucide-react';
import { createCwgSessionWithTasks } from '../lib/data';
import { useAuth } from '../context/AuthContext';
import { CWG_TIMEZONES, CWG_TIMEZONE_LABELS } from '../lib/types';
import type { Session } from '../lib/types';

interface CreateCwgSessionModalProps {
  onClose: () => void;
  onCreated: (session: Session) => void;
}

export default function CreateCwgSessionModal({ onClose, onCreated }: CreateCwgSessionModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);
    try {
      const session = await createCwgSessionWithTasks(
        user.id,
        name.trim(),
        meetingDate,
        description.trim(),
        meetingLink.trim(),
        timezone
      );
      onCreated(session);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        'Failed to create CWG session. Please try signing out and back in.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-slate-900 font-semibold text-base">New Client Working Group</h2>
              <p className="text-slate-500 text-xs">Creates 29 tasks automatically across 6 phases</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-6 pt-5 pb-2">
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex gap-3">
              <Lightbulb className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-teal-800">Pro Tip</p>
                <p className="text-xs text-teal-700 mt-0.5">
                  Target <strong>3-5 consistent participants</strong>. Check support history and AM context before
                  inviting — avoid those already overwhelmed with other engagements.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Project / Session Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q3 Vendor Portal CWG"
                required
                maxLength={100}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Meeting Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                min={today}
                required
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-slate-700"
              />
              <p className="text-xs text-slate-400 mt-1">
                Task due dates (invites, agenda, recap) are calculated from this date.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Link className="w-3.5 h-3.5 text-slate-400" />
                    Meeting Link
                    <span className="text-slate-400 font-normal text-xs">(optional)</span>
                  </span>
                </label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-400" />
                    Time Zone
                  </span>
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all text-slate-700 bg-white"
                >
                  {CWG_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {CWG_TIMEZONE_LABELS[tz]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Context / Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief context about this CWG — what features will be shown, key objectives..."
                rows={3}
                maxLength={500}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1 pb-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || !meetingDate}
                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating tasks...
                  </>
                ) : (
                  'Create CWG Session'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
