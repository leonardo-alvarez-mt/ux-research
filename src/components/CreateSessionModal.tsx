import { useState } from 'react';
import { X, CalendarDays, Loader2, AlertCircle } from 'lucide-react';
import { createSessionWithTasks, updateSession } from '../lib/data';
import { useAuth } from '../context/AuthContext';
import type { Session, SessionType } from '../lib/types';

interface CreateSessionModalProps {
  onClose: () => void;
  onCreated: (session: Session) => void;
  sessionType?: SessionType;
  editSession?: Session;
}

export default function CreateSessionModal({ onClose, onCreated, sessionType = 'usability_test', editSession }: CreateSessionModalProps) {
  const { user } = useAuth();
  const isEdit = !!editSession;
  const [name, setName] = useState(editSession?.name ?? '');
  const [testDate, setTestDate] = useState(editSession?.test_date ?? '');
  const [description, setDescription] = useState(editSession?.description ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError('');
    setLoading(true);

    try {
      if (isEdit && editSession) {
        const updated = await updateSession(editSession.id, {
          name: name.trim(),
          test_date: testDate,
          description: description.trim(),
        });
        onCreated(updated);
      } else {
        const session = await createSessionWithTasks(user.id, name.trim(), testDate, description.trim(), sessionType);
        onCreated(session);
      }
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ||
        (err as { error_description?: string })?.error_description ||
        (isEdit ? 'Failed to update session.' : 'Failed to create session. Please try signing out and back in.');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-slate-900 font-semibold text-base">
                {isEdit ? 'Edit Session' : 'New Usability Session'}
              </h2>
              <p className="text-slate-500 text-xs">
                {isEdit ? 'Update the session name, date, or description' : 'Creates 40+ tasks automatically'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Session Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q3 Onboarding Flow Study"
              required
              maxLength={100}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {editSession?.session_type === 'client_working_group' ? 'Meeting Date' : 'Test Date'} <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={testDate}
              onChange={(e) => setTestDate(e.target.value)}
              min={isEdit ? undefined : today}
              required
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-700"
            />
            {!isEdit && (
              <p className="text-xs text-slate-400 mt-1">
                Task due dates will be calculated automatically from this date.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Description <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this study..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !testDate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEdit ? 'Saving...' : 'Generating tasks...'}
                </>
              ) : (
                isEdit ? 'Save Changes' : 'Create Session'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
