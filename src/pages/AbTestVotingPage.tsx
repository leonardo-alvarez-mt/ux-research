import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, MessageSquare, Maximize2, X } from 'lucide-react';
import { fetchAbTestByShareToken, fetchAbTestBatches, castAbTestVote } from '../lib/data';
import type { AbTest, AbTestBatchWithOptions } from '../lib/types';

interface AbTestVotingPageProps {
  token: string;
  onDone?: () => void;
}

interface VoteSelection {
  optionId: string;
  comment: string;
}

interface LightboxState {
  options: AbTestBatchWithOptions['options'];
  index: number;
}

function Lightbox({ lightbox, onClose }: { lightbox: LightboxState; onClose: () => void }) {
  const [index, setIndex] = useState(lightbox.index);
  const { options } = lightbox;
  const current = options[index];

  const prev = useCallback(() => setIndex((i) => (i - 1 + options.length) % options.length), [options.length]);
  const next = useCallback(() => setIndex((i) => (i + 1) % options.length), [options.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, prev, next]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(15, 15, 25, 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
        aria-label="Close"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); prev(); }}
        className="absolute left-4 sm:left-8 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
        aria-label="Previous"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      <div
        className="relative flex flex-col items-center mx-20 sm:mx-24 max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={current.image_url}
          alt={`Option ${current.label}`}
          className="w-full max-h-[78vh] object-contain rounded-xl shadow-2xl"
        />
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-2">
            <span className="w-6 h-6 bg-white/20 text-white rounded text-xs font-bold flex items-center justify-center">
              {current.label}
            </span>
            {current.caption && (
              <span className="text-sm text-white/90 font-medium">{current.caption}</span>
            )}
          </div>
          <span className="text-white/50 text-xs font-medium">
            {options.map((o) => o.label).join(' / ')} · viewing {current.label}
          </span>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); next(); }}
        className="absolute right-4 sm:right-8 w-11 h-11 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
        aria-label="Next"
      >
        <ArrowRight className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}

export default function AbTestVotingPage({ token, onDone }: AbTestVotingPageProps) {
  const [test, setTest] = useState<AbTest | null>(null);
  const [batches, setBatches] = useState<AbTestBatchWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<'welcome' | number | 'done'>('welcome');
  const [selections, setSelections] = useState<Record<string, VoteSelection>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const t = await fetchAbTestByShareToken(token);
        if (!t) { setNotFound(true); return; }
        const b = await fetchAbTestBatches(t.id);
        setTest(t);
        setBatches(b);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Test not found</h1>
          <p className="text-slate-500 text-sm">This A/B Test link may be invalid or has been unpublished.</p>
          {onDone && (
            <button onClick={onDone} className="mt-6 text-sm text-violet-600 hover:text-violet-700 font-medium">
              Go back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!test) return null;

  const currentIndex = typeof step === 'number' ? step : -1;
  const currentBatch = typeof step === 'number' ? batches[step] : null;
  const progress = typeof step === 'number'
    ? ((step) / batches.length) * 100
    : step === 'done' ? 100 : 0;

  function selectOption(batchId: string, optionId: string) {
    setSelections((prev) => ({
      ...prev,
      [batchId]: { optionId, comment: prev[batchId]?.comment ?? '' },
    }));
  }

  function setComment(batchId: string, comment: string) {
    setSelections((prev) => ({
      ...prev,
      [batchId]: { optionId: prev[batchId]?.optionId ?? '', comment },
    }));
  }

  async function handleNext() {
    if (!currentBatch) return;
    const sel = selections[currentBatch.id];
    if (!sel || !sel.optionId) return;

    if (typeof step === 'number') {
      if (step < batches.length - 1) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    }
  }

  function handleBack() {
    if (typeof step === 'number' && step > 0) {
      setStep(step - 1);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      for (const batch of batches) {
        const sel = selections[batch.id];
        if (sel && sel.optionId) {
          await castAbTestVote(batch.id, sel.optionId, sel.comment);
        }
      }
      setStep('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong submitting your votes. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const isLastBatch = typeof step === 'number' && step === batches.length - 1;

  if (step === 'welcome') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">{test.title}</h1>
          {test.description && (
            <p className="text-slate-500 text-lg mb-8 leading-relaxed">{test.description}</p>
          )}
          {!test.description && <div className="mb-8" />}
          <p className="text-xs text-slate-400 mb-8">
            {batches.length} batch{batches.length !== 1 ? 'es' : ''} to vote on
          </p>
          <button
            onClick={() => setStep(0)}
            disabled={batches.length === 0}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md text-base"
          >
            Start Voting
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-slate-400 mt-6">One vote per person</p>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Thanks for voting!</h1>
          <p className="text-slate-500 text-base leading-relaxed mb-8">
            Your preferences have been recorded successfully.
          </p>
          {onDone && (
            <button onClick={onDone} className="text-sm text-violet-600 hover:text-violet-700 font-medium">
              Done
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!currentBatch) return null;
  const currentSelection = selections[currentBatch.id];

  return (
    <>
      {lightbox && (
        <Lightbox lightbox={lightbox} onClose={() => setLightbox(null)} />
      )}

      <div className="min-h-screen bg-white flex flex-col">
        <div className="fixed top-0 left-0 right-0 h-1 bg-slate-100 z-50">
          <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 flex flex-col px-6 py-10 max-w-5xl mx-auto w-full">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
              Batch {currentIndex + 1} / {batches.length}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
            {currentBatch.prompt}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
            {currentBatch.options.map((option, optionIndex) => {
              const selected = currentSelection?.optionId === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => selectOption(currentBatch.id, option.id)}
                  className={`group relative rounded-xl border-2 overflow-hidden transition-all text-left ${
                    selected
                      ? 'border-violet-500 ring-2 ring-violet-200'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {selected && (
                    <div className="absolute top-3 right-3 z-10 w-7 h-7 bg-violet-600 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="View fullscreen"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightbox({ options: currentBatch.options, index: optionIndex });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        setLightbox({ options: currentBatch.options, index: optionIndex });
                      }
                    }}
                    className="absolute top-3 left-3 z-10 w-7 h-7 bg-black/30 hover:bg-black/50 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                  </div>

                  <div className="bg-slate-50 flex items-center justify-center overflow-hidden" style={{ height: '320px' }}>
                    <img
                      src={option.image_url}
                      alt={`Option ${option.label}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="px-4 py-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded text-xs font-bold flex items-center justify-center">
                      {option.label}
                    </span>
                    {option.caption && (
                      <span className="text-sm text-slate-600 truncate">{option.caption}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              Why did you pick this? <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={currentSelection?.comment ?? ''}
              onChange={(e) => setComment(currentBatch.id, e.target.value)}
              placeholder="Share your thoughts on why you prefer this option..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-slate-400 resize-none"
            />
          </div>

          {submitError && (
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              {currentIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}
            </div>
            <button
              onClick={handleNext}
              disabled={submitting || !currentSelection?.optionId}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-2 rounded-lg transition-all text-sm shadow-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLastBatch ? (
                <><Check className="w-4 h-4" /> Submit Votes</>
              ) : (
                <>Next <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
