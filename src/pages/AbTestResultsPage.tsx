import { useEffect, useState, useCallback } from 'react';
import {
  ArrowLeft,
  Loader2,
  Users,
  GitCompare,
  Plus,
  Trash2,
  Link2,
  Check,
  Upload,
  MessageSquare,
  Trophy,
  Pencil,
  X,
  AlertCircle,
} from 'lucide-react';
import { useRef } from 'react';
import {
  fetchAbTestById,
  fetchAbTestBatches,
  fetchAbTestVotes,
  updateAbTest,
  addAbTestBatch,
  deleteAbTestBatch,
  buildAbTestShareUrl,
} from '../lib/data';
import type { AbTest, AbTestBatchWithOptions, AbTestVoteWithVoter } from '../lib/types';

interface AbTestResultsPageProps {
  testId: string;
  onBack: () => void;
}

interface BatchResult {
  optionVotes: Record<string, number>;
  totalVotes: number;
}

export default function AbTestResultsPage({ testId, onBack }: AbTestResultsPageProps) {
  const [test, setTest] = useState<AbTest | null>(null);
  const [batches, setBatches] = useState<AbTestBatchWithOptions[]>([]);
  const [votes, setVotes] = useState<AbTestVoteWithVoter[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [showEditTitle, setShowEditTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, b, v] = await Promise.all([
        fetchAbTestById(testId),
        fetchAbTestBatches(testId),
        fetchAbTestVotes(testId),
      ]);
      setTest(t);
      setBatches(b);
      setVotes(v);
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  const voteResults = computeResults(batches, votes);
  const totalVotes = votes.length;

  async function handleCopyLink() {
    if (!test) return;
    await navigator.clipboard.writeText(buildAbTestShareUrl(test.share_token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDeleteBatch(batchId: string) {
    if (!confirm('Delete this batch and all its votes? This cannot be undone.')) return;
    setDeletingBatchId(batchId);
    try {
      await deleteAbTestBatch(batchId);
      await load();
    } finally {
      setDeletingBatchId(null);
    }
  }

  async function handleSaveTitle() {
    if (!test) return;
    try {
      const updated = await updateAbTest(test.id, { title: editTitle.trim(), description: editDescription.trim() });
      setTest(updated);
      setShowEditTitle(false);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-7 h-7 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">A/B Test not found.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate leading-tight">{test.title}</h1>
            <p className="text-xs text-slate-400 mt-0.5">A/B Test Results</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">{totalVotes}</span>
              <span className="text-xs text-slate-400">vote{totalVotes !== 1 ? 's' : ''}</span>
            </div>
            <button
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                copied ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-600 hover:bg-violet-700 text-white'
              }`}
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Link2 className="w-3.5 h-3.5" /> Share</>}
            </button>
            <button
              onClick={() => { setEditTitle(test.title); setEditDescription(test.description); setShowEditTitle(true); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all shrink-0"
              title="Edit title"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {batches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GitCompare className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-slate-800 font-semibold mb-2">No batches yet</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed mb-6">
                Add your first batch to start collecting votes.
              </p>
              <button
                onClick={() => setShowAddBatch(true)}
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Batch
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {batches.map((batch, index) => {
                const result = voteResults[batch.id] ?? { optionVotes: {}, totalVotes: 0 };
                return (
                  <BatchResultCard
                    key={batch.id}
                    batch={batch}
                    index={index}
                    result={result}
                    votes={votes.filter((v) => v.batch_id === batch.id)}
                    onDelete={() => handleDeleteBatch(batch.id)}
                    deleting={deletingBatchId === batch.id}
                  />
                );
              })}

              <button
                onClick={() => setShowAddBatch(true)}
                className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50/50 rounded-xl text-sm font-medium text-slate-500 hover:text-violet-600 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Another Batch
              </button>
            </div>
          )}
        </div>
      </div>

      {showEditTitle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Edit A/B Test</h2>
              <button onClick={() => setShowEditTitle(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={100}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowEditTitle(false)} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm">Cancel</button>
                <button onClick={handleSaveTitle} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddBatch && test && (
        <AddBatchModal
          onClose={() => setShowAddBatch(false)}
          onAdded={async () => { setShowAddBatch(false); await load(); }}
          testId={test.id}
        />
      )}
    </div>
  );
}

function computeResults(
  batches: AbTestBatchWithOptions[],
  votes: AbTestVoteWithVoter[]
): Record<string, BatchResult> {
  const results: Record<string, BatchResult> = {};
  for (const batch of batches) {
    const batchVotes = votes.filter((v) => v.batch_id === batch.id);
    const optionVotes: Record<string, number> = {};
    for (const v of batchVotes) {
      optionVotes[v.option_id] = (optionVotes[v.option_id] ?? 0) + 1;
    }
    results[batch.id] = { optionVotes, totalVotes: batchVotes.length };
  }
  return results;
}

interface BatchResultCardProps {
  batch: AbTestBatchWithOptions;
  index: number;
  result: BatchResult;
  votes: AbTestVoteWithVoter[];
  onDelete: () => void;
  deleting: boolean;
}

function BatchResultCard({ batch, index, result, votes, onDelete, deleting }: BatchResultCardProps) {
  const [showComments, setShowComments] = useState(false);

  const optionA = batch.options.find((o) => o.label === 'A');
  const optionB = batch.options.find((o) => o.label === 'B');
  const votesA = optionA ? result.optionVotes[optionA.id] ?? 0 : 0;
  const votesB = optionB ? result.optionVotes[optionB.id] ?? 0 : 0;
  const total = result.totalVotes;
  const winner = votesA > votesB ? optionA : votesB > votesA ? optionB : null;
  const tied = votesA === votesB && total > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
            Batch {index + 1}
          </span>
          <h3 className="text-sm font-semibold text-slate-800 truncate">{batch.prompt}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{total} vote{total !== 1 ? 's' : ''}</span>
          <button
            onClick={onDelete}
            disabled={deleting}
            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete batch"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[optionA, optionB].map((option) => {
            if (!option) return null;
            const count = result.optionVotes[option.id] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isWinner = winner?.id === option.id;
            return (
              <div
                key={option.id}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  isWinner ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
                }`}
              >
                {isWinner && (
                  <div className="bg-emerald-500 text-white text-xs font-semibold px-3 py-1 flex items-center gap-1.5">
                    <Trophy className="w-3 h-3" />
                    Winner
                  </div>
                )}
                {tied && (option.label === 'A') && (
                  <div className="bg-amber-500 text-white text-xs font-semibold px-3 py-1">
                    Tied
                  </div>
                )}
                <div className="aspect-video bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img src={option.image_url} alt={`Option ${option.label}`} className="w-full h-full object-contain" />
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded text-xs font-bold flex items-center justify-center">
                      {option.label}
                    </span>
                    {option.caption && <span className="text-xs text-slate-500 truncate">{option.caption}</span>}
                  </div>
                  <div className="flex items-baseline gap-2 mb-1.5">
                    <span className="text-2xl font-bold text-slate-900">{count}</span>
                    <span className="text-sm text-slate-400">vote{count !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-semibold text-slate-600 ml-auto">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isWinner ? 'bg-emerald-500' : 'bg-violet-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {total > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {showComments ? 'Hide' : 'Show'} comments ({votes.filter((v) => v.comment.trim()).length})
            </button>
            {showComments && (
              <div className="mt-3 space-y-2.5">
                {votes.filter((v) => v.comment.trim()).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No comments on this batch.</p>
                ) : (
                  votes
                    .filter((v) => v.comment.trim())
                    .map((v) => {
                      const opt = batch.options.find((o) => o.id === v.option_id);
                      return (
                        <div key={v.id} className="flex items-start gap-2.5 bg-slate-50 rounded-lg px-3 py-2.5">
                          <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-violet-700">
                              {(v.voter_name || v.voter_email || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-xs font-medium text-slate-700">
                                {v.voter_name || v.voter_email || 'Anonymous'}
                              </span>
                              {opt && (
                                <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                                  Option {opt.label}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed">{v.comment}</p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AddBatchModalProps {
  testId: string;
  onClose: () => void;
  onAdded: () => void;
}

function AddBatchModal({ testId, onClose, onAdded }: AddBatchModalProps) {
  const [prompt, setPrompt] = useState('');
  const [optionA, setOptionA] = useState<{ file: File | null; caption: string; preview: string | null }>({ file: null, caption: '', preview: null });
  const [optionB, setOptionB] = useState<{ file: File | null; caption: string; preview: string | null }>({ file: null, caption: '', preview: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function handleFile(side: 'A' | 'B', file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result as string;
      if (side === 'A') setOptionA((prev) => ({ ...prev, file, preview }));
      else setOptionB((prev) => ({ ...prev, file, preview }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!optionA.file || !optionB.file) {
      setError('Both screenshots are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await addAbTestBatch(
        testId,
        prompt,
        { file: optionA.file, caption: optionA.caption },
        { file: optionB.file, caption: optionB.caption }
      );
      onAdded();
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'Failed to add batch.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-base font-semibold text-slate-900">Add Batch</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Which do you prefer? (optional)"
            maxLength={200}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
          <div className="grid grid-cols-2 gap-3">
            <MiniUploader label="A" data={optionA} onFile={(f) => handleFile('A', f)} onCaption={(c) => setOptionA((prev) => ({ ...prev, caption: c }))} />
            <MiniUploader label="B" data={optionB} onFile={(f) => handleFile('B', f)} onCaption={(c) => setOptionB((prev) => ({ ...prev, caption: c }))} />
          </div>
        </form>
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition-colors text-sm bg-white">Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading || !optionA.file || !optionB.file}
            className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Add Batch'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MiniUploaderProps {
  label: string;
  data: { file: File | null; caption: string; preview: string | null };
  onFile: (file: File) => void;
  onCaption: (caption: string) => void;
}

function MiniUploader({ label, data, onFile, onCaption }: MiniUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-violet-100 text-violet-700 rounded text-xs font-bold flex items-center justify-center">{label}</span>
        <span className="text-xs font-medium text-slate-500">Option {label}</span>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full aspect-video rounded-lg border-2 border-dashed border-slate-300 hover:border-violet-400 bg-white transition-all flex items-center justify-center overflow-hidden"
      >
        {data.preview ? (
          <img src={data.preview} alt={`Option ${label}`} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 py-4">
            <Upload className="w-5 h-5 text-slate-300" />
            <span className="text-xs text-slate-400">Click to upload</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      <input
        type="text"
        value={data.caption}
        onChange={(e) => onCaption(e.target.value)}
        placeholder="Caption (optional)"
        maxLength={100}
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-slate-400 bg-white"
      />
    </div>
  );
}
