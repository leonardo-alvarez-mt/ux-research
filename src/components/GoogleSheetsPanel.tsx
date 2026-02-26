import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sheet,
  Unlink,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchSurveyGoogleSheetsConnection,
  upsertSurveyGoogleSheetsConnection,
  deleteSurveyGoogleSheetsConnection,
} from '../lib/data';
import { supabase } from '../lib/supabase';
import { clearOAuthPending } from '../App';
import type { SurveyGoogleSheetsConnection } from '../lib/types';

interface GoogleSheetsPanelProps {
  surveyId: string;
  surveyTitle: string;
  oauthClaimToken?: string;
}

type PanelStep = 'idle' | 'awaiting_oauth' | 'configure' | 'saving' | 'connected';

interface PendingTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string;
  spreadsheet_id?: string;
  spreadsheet_url?: string;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const PENDING_TOKENS_KEY = 'gsheets_pending_tokens';

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function formatSyncTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function savePendingTokensToStorage(surveyId: string, tokens: PendingTokens) {
  sessionStorage.setItem(PENDING_TOKENS_KEY, JSON.stringify({ surveyId, tokens }));
}

function readPendingTokensFromStorage(surveyId: string): PendingTokens | null {
  try {
    const raw = sessionStorage.getItem(PENDING_TOKENS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.surveyId === surveyId && parsed.tokens) return parsed.tokens as PendingTokens;
    return null;
  } catch (_) {
    return null;
  }
}

function clearPendingTokensFromStorage() {
  sessionStorage.removeItem(PENDING_TOKENS_KEY);
}

export default function GoogleSheetsPanel({ surveyId, surveyTitle, oauthClaimToken }: GoogleSheetsPanelProps) {
  const { user, session } = useAuth();
  const [connection, setConnection] = useState<SurveyGoogleSheetsConnection | null>(null);
  const [step, setStep] = useState<PanelStep>('idle');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('Sheet1');
  const [pendingTokens, setPendingTokens] = useState<PendingTokens | null>(null);
  const [justConnected, setJustConnected] = useState(false);
  const claimHandled = useRef(false);

  useEffect(() => {
    if (!user) return;
    loadConnection();
  }, [user, surveyId]);

  useEffect(() => {
    if (!user) return;
    if (oauthClaimToken && !claimHandled.current) {
      claimHandled.current = true;
      claimPendingTokens(oauthClaimToken);
      return;
    }
    const stored = readPendingTokensFromStorage(surveyId);
    if (stored && !claimHandled.current) {
      setPendingTokens(stored);
      if (stored.spreadsheet_id && stored.spreadsheet_url) {
        autoSaveConnection(stored);
      } else {
        setStep('configure');
      }
    }
  }, [oauthClaimToken, user, surveyId]);

  async function claimPendingTokens(claimToken: string) {
    try {
      const { data, error: fetchErr } = await supabase
        .from('google_oauth_pending_tokens')
        .select('*')
        .eq('claim_token', claimToken)
        .eq('survey_id', surveyId)
        .maybeSingle();

      if (fetchErr || !data) {
        const stored = readPendingTokensFromStorage(surveyId);
        if (stored) {
          setPendingTokens(stored);
          if (stored.spreadsheet_id && stored.spreadsheet_url) {
            autoSaveConnection(stored);
          } else {
            setStep('configure');
          }
        } else {
          setStep('idle');
        }
        clearOAuthPending();
        return;
      }

      const ageMs = Date.now() - new Date(data.created_at).getTime();
      if (ageMs > 10 * 60 * 1000) {
        await supabase.from('google_oauth_pending_tokens').delete().eq('claim_token', claimToken);
        setError('Google authorization expired. Please try connecting again.');
        setStep('idle');
        clearOAuthPending();
        clearPendingTokensFromStorage();
        return;
      }

      const tokens: PendingTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at ?? '',
        spreadsheet_id: data.spreadsheet_id ?? undefined,
        spreadsheet_url: data.spreadsheet_url ?? undefined,
      };

      savePendingTokensToStorage(surveyId, tokens);
      setPendingTokens(tokens);

      await supabase.from('google_oauth_pending_tokens').delete().eq('claim_token', claimToken);
      clearOAuthPending();

      if (tokens.spreadsheet_id && tokens.spreadsheet_url) {
        autoSaveConnection(tokens);
      } else {
        setStep('configure');
      }
    } catch (_) {
      setStep('idle');
    }
  }

  async function autoSaveConnection(tokens: PendingTokens) {
    if (!user || !tokens.spreadsheet_id || !tokens.spreadsheet_url) return;
    setStep('saving');
    setError(null);
    try {
      const conn = await upsertSurveyGoogleSheetsConnection({
        survey_id: surveyId,
        user_id: user.id,
        spreadsheet_id: tokens.spreadsheet_id,
        spreadsheet_url: tokens.spreadsheet_url,
        sheet_name: 'Sheet1',
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_at || null,
        last_synced_at: null,
      });
      setConnection(conn);
      setStep('connected');
      setJustConnected(true);
      clearPendingTokensFromStorage();
      setPendingTokens(null);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      await triggerSync(conn, currentSession?.access_token);
    } catch (_) {
      setError('Failed to save connection. Please try again.');
      setStep('configure');
    }
  }

  async function loadConnection() {
    if (!user) return;
    setLoading(true);
    try {
      const conn = await fetchSurveyGoogleSheetsConnection(surveyId, user.id);
      setConnection(conn);
      if (conn) {
        setStep('connected');
      }
    } catch (_) {
      // step will be set by other effects
    } finally {
      setLoading(false);
    }
  }

  async function startOAuth() {
    setError(null);
    const appUrl = window.location.href;
    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/google-sheets-oauth?action=auth_url&survey_id=${encodeURIComponent(surveyId)}&survey_title=${encodeURIComponent(surveyTitle)}&app_url=${encodeURIComponent(appUrl)}`,
      { headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` } }
    );
    const json = await res.json();
    if (json.url) {
      window.location.href = json.url;
    } else {
      setError('Failed to start Google authorization. Please try again.');
    }
  }

  async function saveConnection() {
    if (!user || !pendingTokens) return;
    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      setError('Please enter a valid Google Sheets URL.');
      return;
    }
    setError(null);
    try {
      const conn = await upsertSurveyGoogleSheetsConnection({
        survey_id: surveyId,
        user_id: user.id,
        spreadsheet_id: spreadsheetId,
        spreadsheet_url: sheetUrl,
        sheet_name: sheetName || 'Sheet1',
        google_access_token: pendingTokens.access_token,
        google_refresh_token: pendingTokens.refresh_token,
        token_expires_at: pendingTokens.expires_at || null,
        last_synced_at: null,
      });
      setConnection(conn);
      setStep('connected');
      setJustConnected(true);
      clearPendingTokensFromStorage();
      setPendingTokens(null);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      await triggerSync(conn, currentSession?.access_token);
    } catch (_) {
      setError('Failed to save connection. Please try again.');
    }
  }

  async function triggerSync(conn?: SurveyGoogleSheetsConnection, sessionToken?: string) {
    const target = conn ?? connection;
    const token = sessionToken ?? session?.access_token;
    if (!target || !token) return;
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/sync-to-google-sheets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ survey_id: surveyId }),
      });
      const json = await res.json();
      if (json.error) {
        setError(`Sync failed: ${json.error}`);
      } else {
        await loadConnection();
      }
    } catch (_) {
      setError('Sync failed. Please try again.');
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!user) return;
    try {
      await deleteSurveyGoogleSheetsConnection(surveyId, user.id);
      setConnection(null);
      setStep('idle');
      setJustConnected(false);
    } catch (_) {
      setError('Failed to disconnect.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  if (step === 'connected' && connection) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {justConnected && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium animate-pulse">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Connected successfully</span>
          </div>
        )}
        {!justConnected && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-medium">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Connected</span>
          </div>
        )}
        <a
          href={connection.spreadsheet_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <Sheet className="w-3.5 h-3.5" />
          <span className="truncate max-w-[160px]">{connection.sheet_name}</span>
          <ExternalLink className="w-3 h-3" />
        </a>
        {connection.last_synced_at && (
          <span className="text-xs text-slate-400">
            Synced {formatSyncTime(connection.last_synced_at)}
          </span>
        )}
        <button
          onClick={() => triggerSync()}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {syncing ? 'Syncing…' : 'Sync Now'}
        </button>
        <button
          onClick={disconnect}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Disconnect Google Sheets"
        >
          <Unlink className="w-3.5 h-3.5" />
        </button>
        {error && <p className="w-full text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  if (step === 'saving') {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-sm">
        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
        <span>Setting up your spreadsheet&hellip;</span>
      </div>
    );
  }

  if (step === 'configure') {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm w-full max-w-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <span className="text-sm font-semibold text-slate-800">Google authorized</span>
          </div>
          <button
            onClick={() => { setStep('idle'); setPendingTokens(null); clearOAuthPending(); clearPendingTokensFromStorage(); }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Paste the URL of the Google Spreadsheet where responses should be saved, then enter the sheet tab name.
        </p>
        <div className="space-y-2 mb-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Spreadsheet URL</label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sheet Tab Name</label>
            <input
              type="text"
              value={sheetName}
              onChange={(e) => setSheetName(e.target.value)}
              placeholder="Sheet1"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
        <button
          onClick={saveConnection}
          className="w-full py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          Connect &amp; Sync All Responses
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={startOAuth}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <Sheet className="w-3.5 h-3.5 text-emerald-600" />
        Connect Google Sheets
      </button>
      {error && (
        <div className="flex items-start gap-1.5 mt-1">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
