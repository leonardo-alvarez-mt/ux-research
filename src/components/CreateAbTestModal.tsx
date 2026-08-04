import { useState, useRef } from 'react';
import { X, GitCompare, Loader2, AlertCircle, Plus, Trash2, Upload, Check, Copy, Link2 } from 'lucide-react';
import { createAbTest, buildAbTestShareUrl } from '../lib/data';
import type { AbTestBatchInput } from '../lib/data';
import { useAuth } from '../context/AuthContext';
import type { AbTest } from '../lib/types';

interface CreateAbTestModalProps {
  onClose: () => void;
  onCreated: (test: AbTest) => void;
}

interface BatchForm {
  prompt: string;
  optionA: { file: File | null; caption: string; preview: string | null };
  optionB: { file: File | null; caption: string; preview: string | null };
}

function makeEmptyBatch(): BatchForm {
  return {
    prompt: '',
    optionA: { file: null, caption: '', preview: null },
    optionB: { file: null, caption: '', preview: null },
  };
}

export default function CreateAbTestModal({ onClose, onCreated }: CreateAbTestModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [batches, setBatches] = useState<BatchForm[]>([makeEmptyBatch()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdTest, setCreatedTest] = useState<AbTest | null>(null);
  const [copied, setCopied] = useState(false);

  function updateBatch(index: number, updates: Partial<BatchForm>) {
    setBatches((prev) => prev.map((b, i) => (i === index ? { ...b, ...updates } : b)));
  }

  function addBatch() {
    setBatches((prev) => [...prev, makeEmptyBatch()]);
  }

  function removeBatch(index: number) {
    setBatches((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFileSelect(index: number, side: 'A' | 'B', file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result as string;
      setBatches((prev) =>
        prev.map((b, i) => {
          if (i !== index) return b;
          if (side === 'A') return { ...b, optionA: { file, caption: b.optionA.caption, preview } };
          return { ...b, optionB: { file, caption: b.optionB.caption, preview } };
        })
      );
    };
    reader.readAsDataURL(file);
  }

  function validate(): string | null {
    if (!title.trim()) return 'Please enter a test title.';
    if (batches.length === 0) return 'Please add at least one batch.';
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (!b.optionA.file || !b.optionB.file) {
        return `Batch ${i + 1}: both screenshots A and B are required.`;
      }
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const batchInputs: AbTestBatchInput[] = batches.map((b) => ({
        prompt: b.prompt,
        optionA: { file: b.optionA.file!, caption: b.optionA.caption },
        optionB: { file: b.optionB.file!, caption: b.optionB.caption },
      }));
      const test = await createAbTest(user.id, title, description, batchInputs);
      setCreatedTest(test);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to create A/B Test.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    if (!createdTest) return;
    await navigator.clipboard.writeText(buildAbTestShareUrl(createdTest.share_token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (createdTest) {
    const shareUrl = buildAbTestShareUrl(createdTest.share_token);
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-slate-900 font-semibold text-base">A/B Test Created</h2>
                <p className="text-slate-500 text-xs">Share the link below to collect votes</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-6 py-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">Public Share Link</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 min-w-0">
                  <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 truncate font-mono">{shareUrl}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                    copied ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {copied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex gap-3">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                Voters will need to sign in with their @mitratech.com Google account to vote. Each person can vote once per batch.
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm">
                Close
              </button>
              <button
                onClick={() => onCreated(createdTest)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-slate-900 font-semibold text-base">New A/B Test</h2>
              <p className="text-slate-500 text-xs">Upload screenshot pairs and let your team vote</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Test Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Homepage Hero Section Comparison"
                required
                maxLength={100}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you testing? What decision will the results inform?"
                rows={2}
                maxLength={500}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
              />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Batches <span className="text-slate-400 font-normal">({batches.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={addBatch}
                  className="flex items-center gap-1.5 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Batch
                </button>
              </div>

              <div className="space-y-4">
                {batches.map((batch, index) => (
                  <BatchEditor
                    key={index}
                    batch={batch}
                    index={index}
                    canRemove={batches.length > 1}
                    onUpdate={(updates) => updateBatch(index, updates)}
                    onRemove={() => removeBatch(index)}
                    onFileSelect={(side, file) => handleFileSelect(index, side, file)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-100 transition-colors text-sm bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create A/B Test'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface BatchEditorProps {
  batch: BatchForm;
  index: number;
  canRemove: boolean;
  onUpdate: (updates: Partial<BatchForm>) => void;
  onRemove: () => void;
  onFileSelect: (side: 'A' | 'B', file: File) => void;
}

function BatchEditor({ batch, index, canRemove, onUpdate, onRemove, onFileSelect }: BatchEditorProps) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Batch {index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="Remove batch"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <input
        type="text"
        value={batch.prompt}
        onChange={(e) => onUpdate({ prompt: e.target.value })}
        placeholder="Which do you prefer? (optional — defaults to 'Which do you prefer?')"
        maxLength={200}
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-slate-400 bg-white"
      />

      <div className="grid grid-cols-2 gap-3">
        <OptionUploader
          label="A"
          caption={batch.optionA.caption}
          preview={batch.optionA.preview}
          onCaptionChange={(caption) => onUpdate({ optionA: { ...batch.optionA, caption } })}
          onFileSelect={(file) => onFileSelect('A', file)}
        />
        <OptionUploader
          label="B"
          caption={batch.optionB.caption}
          preview={batch.optionB.preview}
          onCaptionChange={(caption) => onUpdate({ optionB: { ...batch.optionB, caption } })}
          onFileSelect={(file) => onFileSelect('B', file)}
        />
      </div>
    </div>
  );
}

interface OptionUploaderProps {
  label: string;
  caption: string;
  preview: string | null;
  onCaptionChange: (caption: string) => void;
  onFileSelect: (file: File) => void;
}

function OptionUploader({ label, caption, preview, onCaptionChange, onFileSelect }: OptionUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pasteHighlight, setPasteHighlight] = useState(false);

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onFileSelect(file);
          return;
        }
      }
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 bg-violet-100 text-violet-700 rounded text-xs font-bold flex items-center justify-center">
          {label}
        </span>
        <span className="text-xs font-medium text-slate-500">Option {label}</span>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onPaste={handlePaste}
        onPasteOver={() => setPasteHighlight(false)}
        onDragOver={(e) => { e.preventDefault(); setPasteHighlight(true); }}
        onDragLeave={() => setPasteHighlight(false)}
        onDrop={(e) => {
          e.preventDefault();
          setPasteHighlight(false);
          const file = e.dataTransfer.files?.[0];
          if (file && file.type.startsWith('image/')) onFileSelect(file);
        }}
        tabIndex={0}
        className={`w-full aspect-video rounded-lg border-2 border-dashed transition-all flex items-center justify-center overflow-hidden outline-none ${
          pasteHighlight
            ? 'border-violet-500 bg-violet-50'
            : preview
              ? 'border-violet-300 bg-white'
              : 'border-slate-300 hover:border-violet-400 bg-white'
        }`}
      >
        {preview ? (
          <img src={preview} alt={`Option ${label}`} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 py-4">
            <Upload className="w-5 h-5 text-slate-300" />
            <span className="text-xs text-slate-400">Click or paste (Ctrl/Cmd+V)</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
      />
      <input
        type="text"
        value={caption}
        onChange={(e) => onCaptionChange(e.target.value)}
        placeholder="Caption (optional)"
        maxLength={100}
        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-slate-400 bg-white"
      />
    </div>
  );
}
