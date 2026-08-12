import { useState } from 'react';
import { X, Copy, Check, Terminal, ExternalLink, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { critSupabase } from '../lib/critSupabase';

interface NewCritModalProps {
  onClose: () => void;
  onCreated: (projectId: string) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generateCritKey(title: string): string {
  const slug = slugify(title).slice(0, 35);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${slug}-${suffix}`;
}

const WIDGET_SCRIPT_BASE = 'https://twetzrmkrfwkrokaeiya.supabase.co/storage/v1/object/public/assets/widget.js';

export default function NewCritModal({ onClose, onCreated }: NewCritModalProps) {
  const [step, setStep] = useState<'input' | 'setup'>('input');
  const [title, setTitle] = useState('');
  const [prototypeUrl, setPrototypeUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState('');
  const [createdId, setCreatedId] = useState('');
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showScriptFallback, setShowScriptFallback] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a project title.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const projectKey = generateCritKey(title.trim());
    try {
      const { data, error: insertError } = await critSupabase
        .from('projects')
        .insert({
          project_id: projectKey,
          title: title.trim(),
          project_url: prototypeUrl.trim() || null,
          walkthrough_url: null,
          is_published: false,
          questions: [],
          next_steps: [],
        })
        .select()
        .single();
      if (insertError) throw new Error(insertError.message);
      setCreatedKey(projectKey);
      setCreatedId(data.id);
      setStep('setup');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyText(text: string, which: 'cmd' | 'script') {
    await navigator.clipboard.writeText(text);
    if (which === 'cmd') {
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  }

  const cliCommand = `npx get-crit ${createdKey}`;
  const scriptTag = `<script src="${WIDGET_SCRIPT_BASE}" data-project-key="${createdKey}" async></script>`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {step === 'input' ? 'Create New Design Crit' : 'Project Created'}
            </h2>
            <p className="text-xs text-slate-500">
              {step === 'input' ? 'Set up a new prototype walkthrough' : 'Inject the widget into your codebase'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'input' && (
          <form onSubmit={handleGenerate} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Project Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Inflight Map Redesign"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                Prototype URL <span className="text-slate-400 font-normal normal-case">(optional)</span>
              </label>
              <input
                type="url"
                value={prototypeUrl}
                onChange={(e) => setPrototypeUrl(e.target.value)}
                placeholder="https://mitratech-grc-design.github.io/crit"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm shadow-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Crit Key
                </>
              )}
            </button>
          </form>
        )}

        {step === 'setup' && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3 bg-emerald-50 rounded-xl p-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900">Project Created!</p>
                <p className="text-xs text-emerald-700">Inject the widget into your codebase.</p>
              </div>
            </div>

            <div className="text-xs font-mono text-slate-400 bg-slate-50 rounded-lg px-3 py-1.5 inline-block">
              {createdKey}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
                Terminal Command
              </label>
              <div className="relative rounded-xl bg-slate-900 border border-slate-700 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700 bg-slate-800">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-xs text-slate-400 font-medium">bash</span>
                  <button
                    onClick={() => copyText(cliCommand, 'cmd')}
                    className="ml-auto flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    {copiedCmd ? (
                      <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy</>
                    )}
                  </button>
                </div>
                <pre className="px-4 py-3.5 text-sm text-emerald-300 font-mono overflow-x-auto">
                  <code>{cliCommand}</code>
                </pre>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Open your prototype repository terminal and paste the command above.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Start your local server or deploy to staging, then open your URL with{' '}
                  <code className="text-xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">?crit_mode=creator</code>{' '}
                  to record your walkthrough video.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowScriptFallback((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span>Manual script fallback</span>
                {showScriptFallback ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showScriptFallback && (
                <div className="px-4 pb-4">
                  <div className="relative rounded-lg bg-slate-900 border border-slate-700 overflow-hidden">
                    <button
                      onClick={() => copyText(scriptTag, 'script')}
                      className="absolute top-2 right-2 flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors z-10"
                    >
                      {copiedScript ? (
                        <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy</>
                      )}
                    </button>
                    <pre className="px-4 py-3.5 text-sm text-sky-300 font-mono overflow-x-auto">
                      <code>{scriptTag}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => onCreated(createdKey)}
                className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-all text-sm shadow-sm"
              >
                Done &amp; Go to Dashboard
              </button>
              {prototypeUrl.trim() && (
                <a
                  href={`${prototypeUrl.trim()}?crit_mode=creator`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2.5 rounded-lg transition-all text-sm"
                >
                  Open Creator Mode
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
