import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase } from './lib/supabase';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import MySessionsPage from './pages/MySessionsPage';
import ArchivePage from './pages/ArchivePage';
import ParticipantsPage from './pages/ParticipantsPage';
import SessionDetailPage from './pages/SessionDetailPage';
import SharedSessionPage from './pages/SharedSessionPage';
import SurveyBuilderPage from './pages/SurveyBuilderPage';
import SurveyResponsePage from './pages/SurveyResponsePage';
import SurveyResultsPage from './pages/SurveyResultsPage';
import AbTestVotingPage from './pages/AbTestVotingPage';
import AbTestResultsPage from './pages/AbTestResultsPage';
import CritsPage from './pages/CritsPage';
import CritDetailPage from './pages/CritDetailPage';
import Sidebar, { MobileMenuButton } from './components/Sidebar';
import { Loader2 } from 'lucide-react';

type AuthView = 'login' | 'signup' | 'forgot-password' | 'reset-password';
type AppView = 'dashboard' | 'sessions' | 'participants' | 'archive' | 'session-detail' | 'survey-builder' | 'survey-results' | 'ab-test-results' | 'crits' | 'crit-detail';

const OAUTH_PENDING_KEY = 'google_sheets_oauth_pending';

interface OAuthPending {
  surveyId: string;
  claimToken: string;
}

function detectPasswordRecovery(): boolean {
  const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
  return hashParams.get('type') === 'recovery';
}

function getAppPathname(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = window.location.pathname;
  if (base && path.startsWith(base)) {
    return path.slice(base.length) || '/';
  }
  return path;
}

function getPathTokens(): { shareToken: string | null; surveyToken: string | null; abTestToken: string | null } {
  const pathname = getAppPathname();
  const shareMatch = pathname.match(/^\/share\/([a-f0-9-]{36})$/i);
  const surveyMatch = pathname.match(/^\/survey\/([a-f0-9-]{36})$/i);
  const abTestMatch = pathname.match(/^\/abtest\/([a-f0-9-]{36})$/i);
  return {
    shareToken: shareMatch ? shareMatch[1] : null,
    surveyToken: surveyMatch ? surveyMatch[1] : null,
    abTestToken: abTestMatch ? abTestMatch[1] : null,
  };
}

function consumeOAuthCallbackParams(): OAuthPending | null {
  const params = new URLSearchParams(window.location.search);
  const sheetsConnected = params.get('sheets_connected');
  const surveyId = params.get('survey_id');
  const claimToken = params.get('claim_token');
  const sheetsError = params.get('sheets_error');

  const clean = new URL(window.location.href);
  clean.searchParams.delete('sheets_connected');
  clean.searchParams.delete('survey_id');
  clean.searchParams.delete('claim_token');
  clean.searchParams.delete('sheets_error');
  window.history.replaceState({}, '', clean.toString());

  if (sheetsError && surveyId) {
    sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify({ surveyId, claimToken: '', error: sheetsError }));
    return null;
  }

  if (sheetsConnected === '1' && surveyId && claimToken) {
    const pending: OAuthPending = { surveyId, claimToken };
    sessionStorage.setItem(OAUTH_PENDING_KEY, JSON.stringify(pending));
    return pending;
  }

  return null;
}

function readStoredOAuthPending(): OAuthPending | null {
  try {
    const raw = sessionStorage.getItem(OAUTH_PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.surveyId && parsed.claimToken) return parsed as OAuthPending;
    return null;
  } catch (_) {
    return null;
  }
}

export function clearOAuthPending() {
  sessionStorage.removeItem(OAUTH_PENDING_KEY);
}

function AppContent() {
  const { user, loading, authError, clearAuthError } = useAuth();
  const [authView, setAuthView] = useState<AuthView>(() => {
    if (detectPasswordRecovery()) return 'reset-password';
    return 'login';
  });
  const [appView, setAppView] = useState<AppView>('dashboard');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSurveyId, setSelectedSurveyId] = useState<string | null>(null);
  const [selectedAbTestId, setSelectedAbTestId] = useState<string | null>(null);
  const [selectedCritProjectId, setSelectedCritProjectId] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1024);
  const [shareToken, setShareToken] = useState<string | null>(() => getPathTokens().shareToken);
  const [surveyToken, setSurveyToken] = useState<string | null>(() => getPathTokens().surveyToken);
  const [abTestToken, setAbTestToken] = useState<string | null>(() => getPathTokens().abTestToken);
  const [refreshKey, setRefreshKey] = useState(0);
  const [oauthPending, setOauthPending] = useState<OAuthPending | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset-password');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const pending = consumeOAuthCallbackParams();
    if (pending) {
      setOauthPending(pending);
    }
  }, []);

  useEffect(() => {
    function handleResize() {
      setSidebarCollapsed(window.innerWidth < 1024);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (shareToken || surveyToken || abTestToken) {
      window.history.replaceState({}, '', import.meta.env.BASE_URL);
    }
  }, [shareToken, surveyToken, abTestToken]);

  useEffect(() => {
    if (!user || loading) return;

    const pending = oauthPending ?? readStoredOAuthPending();
    if (pending) {
      setSelectedSurveyId(pending.surveyId);
      setAppView('survey-results');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (abTestToken) {
    return (
      <AbTestVotingPage
        token={abTestToken}
        onDone={() => setAbTestToken(null)}
      />
    );
  }

  if (surveyToken) {
    return (
      <SurveyResponsePage
        token={surveyToken}
        onDone={() => setSurveyToken(null)}
      />
    );
  }

  if (shareToken && !user) {
    return (
      <SharedSessionPage
        token={shareToken}
        onSignIn={() => setShareToken(null)}
      />
    );
  }

  if (!user || authView === 'reset-password') {
    if (authView === 'reset-password') {
      return <ResetPasswordPage onBackToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'signup') {
      return <SignUpPage onSwitchToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot-password') {
      return <ForgotPasswordPage onBackToLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginPage
        onSwitchToSignUp={() => setAuthView('signup')}
        onForgotPassword={() => setAuthView('forgot-password')}
        externalError={authError}
        onClearExternalError={clearAuthError}
      />
    );
  }

  function handleViewSession(id: string) {
    setSelectedSessionId(id);
    setAppView('session-detail');
  }

  function handleBackFromSession() {
    setSelectedSessionId(null);
    setAppView('dashboard');
    setRefreshKey((k) => k + 1);
  }

  function handleOpenSurveyBuilder(surveyId: string) {
    setSelectedSurveyId(surveyId);
    setAppView('survey-builder');
  }

  function handleOpenSurveyResults(surveyId: string) {
    setSelectedSurveyId(surveyId);
    setAppView('survey-results');
  }

  function handleBackFromSurvey() {
    setSelectedSurveyId(null);
    setAppView('dashboard');
    setRefreshKey((k) => k + 1);
  }

  function handleOpenAbTestResults(testId: string) {
    setSelectedAbTestId(testId);
    setAppView('ab-test-results');
  }

  function handleBackFromAbTest() {
    setSelectedAbTestId(null);
    setAppView('dashboard');
    setRefreshKey((k) => k + 1);
  }

  function handleNavigate(view: 'dashboard' | 'sessions' | 'participants' | 'archive' | 'crits') {
    setAppView(view);
    setSelectedSessionId(null);
    setSelectedSurveyId(null);
    setSelectedAbTestId(null);
    setSelectedCritProjectId(null);
  }

  function handleOpenCritDetail(projectId: string) {
    setSelectedCritProjectId(projectId);
    setAppView('crit-detail');
  }

  function handleBackFromCrit() {
    setSelectedCritProjectId(null);
    setAppView('crits');
    setRefreshKey((k) => k + 1);
  }

  const sidebarView =
    appView === 'session-detail' || appView === 'survey-builder' || appView === 'survey-results' || appView === 'ab-test-results' || appView === 'crit-detail'
      ? appView === 'crit-detail' ? 'crits' : 'dashboard'
      : (appView as 'dashboard' | 'sessions' | 'participants' | 'archive' | 'crits');

  const pageTitle: Record<AppView, string> = {
    dashboard: 'Dashboard',
    sessions: 'My Sessions',
    participants: 'Participants',
    archive: 'Archive',
    crits: 'Design Crits',
    'session-detail': 'Session Detail',
    'survey-builder': 'Survey Builder',
    'survey-results': 'Survey Results',
    'ab-test-results': 'A/B Test Results',
    'crit-detail': 'Crit Dashboard',
  };

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <Sidebar
        currentView={sidebarView}
        onNavigate={handleNavigate}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 rounded-2xl my-2 mr-2">
        {appView !== 'survey-builder' && appView !== 'ab-test-results' && appView !== 'crit-detail' && (
          <header className="bg-slate-50 px-6 py-4 flex items-center gap-4 shrink-0 border-b border-slate-200/80 rounded-t-2xl">
            <MobileMenuButton onClick={() => setMobileSidebarOpen(true)} />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">{pageTitle[appView]}</h2>
              <p className="text-xs text-slate-400">Master Usability Governance Checklist</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-xs text-blue-700 font-medium">Live</span>
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 flex flex-col overflow-hidden">
          {appView === 'dashboard' && (
            <DashboardPage
              onViewSession={handleViewSession}
              onViewSurvey={handleOpenSurveyBuilder}
              onViewSurveyResults={handleOpenSurveyResults}
              onViewAbTestResults={handleOpenAbTestResults}
              refreshKey={refreshKey}
            />
          )}
          {appView === 'sessions' && (
            <MySessionsPage onViewSession={handleViewSession} refreshKey={refreshKey} />
          )}
          {appView === 'crits' && (
            <CritsPage onOpenDetail={handleOpenCritDetail} refreshKey={refreshKey} />
          )}
          {appView === 'crit-detail' && selectedCritProjectId && (
            <CritDetailPage projectId={selectedCritProjectId} onBack={handleBackFromCrit} />
          )}
          {appView === 'archive' && (
            <ArchivePage onViewSession={handleViewSession} />
          )}
          {appView === 'participants' && (
            <ParticipantsPage />
          )}
          {appView === 'session-detail' && selectedSessionId && (
            <SessionDetailPage
              sessionId={selectedSessionId}
              onBack={handleBackFromSession}
            />
          )}
          {appView === 'survey-builder' && selectedSurveyId && (
            <SurveyBuilderPage
              surveyId={selectedSurveyId}
              onBack={handleBackFromSurvey}
              onViewResults={handleOpenSurveyResults}
            />
          )}
          {appView === 'survey-results' && selectedSurveyId && (
            <SurveyResultsPage
              surveyId={selectedSurveyId}
              onBack={() => handleOpenSurveyBuilder(selectedSurveyId)}
              oauthClaimToken={
                (oauthPending?.surveyId === selectedSurveyId ? oauthPending.claimToken : undefined) ??
                (readStoredOAuthPending()?.surveyId === selectedSurveyId ? readStoredOAuthPending()?.claimToken ?? undefined : undefined)
              }
            />
          )}
          {appView === 'ab-test-results' && selectedAbTestId && (
            <AbTestResultsPage
              testId={selectedAbTestId}
              onBack={handleBackFromAbTest}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
