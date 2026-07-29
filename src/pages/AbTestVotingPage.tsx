import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, MessageSquare, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAbTestByShareToken, fetchAbTestBatches, fetchMyAbTestVotes, castAbTestVote } from '../lib/data';
import type { AbTest, AbTestBatchWithOptions, AbTestVote } from '../lib/types';

interface AbTestVotingPageProps {
  token: string;
  onDone?: () => void;
  onSignInNeeded?: () => void;
}

interface VoteSelection {
  optionId: string;
  comment: string;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5836-5.036-3.7105H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71c-.18-.54-.2827-1.1168-.2827-1.71s.1027-1.17.2827-1.71V4.9582H.9574C.3477 6.1732 0 7.5482 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1632 6.656 3.5795 9 3.5795z" fill="#EA4335"/>
    </svg>
  );
}

export default function AbTestVotingPage({ token, onDone, onSignInNeeded }: AbTestVotingPageProps) {
  const [test, setTest] = useState<AbTest | null>(null);
  const [batches, setBatches] = useState<AbTestBatchWithOptions[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, AbTestVote>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [step, setStep] = useState<'welcome' | number | 'done'>('welcome');
  const [selections, setSelections] = useState<Record<string, VoteSelection>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setAuthChecked(true);

      if (!session) {
        setLoading(false);
        return;
      }

      try {
        const t = await fetchAbTestByShareToken(token);
        if (!t) { setNotFound(true); return; }
        const b = await fetchAbTestBatches(t.id);
        const votes = await fetchMyAbTestVotes(t.id);
        const voteMap: Record<string, AbTestVote> = {};
        for (const v of votes) voteMap[v.batch_id] = v;
        setTest(t);
        setBatches(b);
        setMyVotes(voteMap);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  async function handleSignIn() {
    const returnUrl = window.location.href;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: returnUrl,
        queryParams: {
          hd: 'mitratech.com',
          prompt: 'select_account',
        },
      },
    });
    if (error && onSignInNeeded) {
      onSignInNeeded();
    }
  }

  if (loading || !authChecked) {
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2d1b4e 0%, #4c1d95 30%, #6d28d9 70%, #7c3aed 100%)' }}>
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full px-9 py-10">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center">
                <Shield className="w-7 h-7 text-violet-600" />
              </div>
            </div>
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-slate-900 mb-1">Sign in to vote</h1>
              <p className="text-sm text-slate-500">Use your Mitratech Google account to participate in this A/B Test.</p>
            </div>
            <button
              type="button"
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-lg py-2.5 px-4 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </button>
            <p className="mt-4 text-center text-xs text-slate-400">
              Only <span className="font-medium text-slate-500">@mitratech.com</span> accounts can vote
            </p>
            {onDone && (
              <button onClick={onDone} className="mt-6 block mx-auto text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Cancel
              </button>
            )}
          </div>
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
    } catch {
      setSubmitError('Something went wrong submitting your votes. Please try again.');
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
          <p className="text-xs text-slate-400 mt-6">Your vote is tied to your account</p>
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
  const existingVote = myVotes[currentBatch.id];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-100 z-50">
        <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 flex flex-col px-6 py-10 max-w-5xl mx-auto w-full">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
            Batch {currentIndex + 1} / {batches.length}
          </span>
          {existingVote && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              You voted before — voting again will update your choice
            </span>
          )}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
          {currentBatch.prompt}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
          {currentBatch.options.map((option) => {
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
                <div className="aspect-video bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img src={option.image_url} alt={`Option ${option.label}`} className="w-full h-full object-contain" />
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
  );
}
