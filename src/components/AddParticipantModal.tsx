import { useState, useEffect } from 'react';
import { X, UserPlus, Search, Plus, Loader2, AlertCircle, Users } from 'lucide-react';
import { fetchParticipants, createParticipant, addParticipantToSession } from '../lib/data';
import { useAuth } from '../context/AuthContext';
import type { Participant } from '../lib/types';

interface AddParticipantModalProps {
  sessionId: string;
  alreadyAddedIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}

type ModalView = 'list' | 'create';

export default function AddParticipantModal({
  sessionId,
  alreadyAddedIds,
  onClose,
  onAdded,
}: AddParticipantModalProps) {
  const { user } = useAuth();
  const [view, setView] = useState<ModalView>('list');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const [slot, setSlot] = useState('');
  const [error, setError] = useState('');

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newClient, setNewClient] = useState('');
  const [newAccountManager, setNewAccountManager] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newCustomerType, setNewCustomerType] = useState('new');
  const [newNotes, setNewNotes] = useState('');

  const CUSTOMER_TYPES = [
    { value: 'new', label: 'New Customer' },
    { value: 'established', label: 'Established Customer' },
  ];

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (user) {
      fetchParticipants(user.id)
        .then(setParticipants)
        .finally(() => setLoadingList(false));
    }
  }, [user]);

  const filtered = participants.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.client.toLowerCase().includes(q)
    );
  });

  async function handleAdd(participantId: string) {
    setError('');
    setAddingId(participantId);
    try {
      await addParticipantToSession(sessionId, participantId, slot);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add participant.');
    } finally {
      setAddingId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setCreateError('');
    setCreating(true);
    try {
      const p = await createParticipant(user.id, {
        name: newName.trim(),
        email: newEmail.trim(),
        client: newClient.trim(),
        account_manager: newAccountManager.trim(),
        product: newProduct.trim(),
        customer_type: newCustomerType,
        notes: newNotes.trim(),
      });
      setParticipants((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)));
      await addParticipantToSession(sessionId, p.id, slot);
      onAdded();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create participant.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-slate-900 font-semibold text-base">Add Participant</h2>
              <p className="text-slate-500 text-xs">
                {view === 'list' ? 'Select from your roster or create new' : 'Create a new participant'}
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

        <div className="px-6 pt-4 pb-2 shrink-0">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Time Slot <span className="text-slate-400 font-normal">(optional, e.g. "10:00 AM")</span>
          </label>
          <input
            type="text"
            value={slot}
            onChange={(e) => setSlot(e.target.value)}
            placeholder="e.g. 10:00 AM"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
          />
        </div>

        <div className="flex border-b border-slate-100 px-6 shrink-0">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              view === 'list'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5" />
              Existing Roster
            </span>
          </button>
          <button
            onClick={() => setView('create')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              view === 'create'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" />
              Create New
            </span>
          </button>
        </div>

        {view === 'list' && (
          <div className="flex flex-col overflow-hidden flex-1">
            <div className="px-6 pt-4 shrink-0">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or client..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
              {loadingList ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Users className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">
                    {participants.length === 0
                      ? 'No participants yet. Create one to get started.'
                      : 'No matches found.'}
                  </p>
                  <button
                    onClick={() => setView('create')}
                    className="mt-3 text-blue-600 hover:underline text-xs font-medium"
                  >
                    Create new participant
                  </button>
                </div>
              ) : (
                filtered.map((p) => {
                  const alreadyAdded = alreadyAddedIds.has(p.id);
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-blue-700 font-bold text-xs">
                            {p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{p.name}</p>
                          <p className="text-xs text-slate-500 truncate">{p.email || '—'}</p>
                          {p.client && (
                            <p className="text-xs text-slate-400 truncate">{p.client}</p>
                          )}
                        </div>
                      </div>
                      {alreadyAdded ? (
                        <span className="text-xs text-emerald-600 font-medium shrink-0 bg-emerald-50 px-2.5 py-1 rounded-full">
                          Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAdd(p.id)}
                          disabled={addingId === p.id}
                          className="shrink-0 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {addingId === p.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          Add
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {view === 'create' && (
          <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {createError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{createError}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Aaron Blazevic"
                required
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="ablazevic@example.com"
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Client</label>
                <input
                  type="text"
                  value={newClient}
                  onChange={(e) => setNewClient(e.target.value)}
                  placeholder="Beal Service Corp."
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Account Manager</label>
                <input
                  type="text"
                  value={newAccountManager}
                  onChange={(e) => setNewAccountManager(e.target.value)}
                  placeholder="Kristyn Lashbrook"
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Product</label>
              <input
                type="text"
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
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
                    onClick={() => setNewCustomerType(ct.value)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      newCustomerType === ct.value
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
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Any relevant notes about this participant..."
                rows={2}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 resize-none"
              />
            </div>

            <div className="flex gap-3 pb-2">
              <button
                type="button"
                onClick={() => setView('list')}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create & Add'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
