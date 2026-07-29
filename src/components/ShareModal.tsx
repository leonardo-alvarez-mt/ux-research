import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Link2,
  Users,
  Copy,
  Check,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Shield,
  Eye,
  Pencil,
} from 'lucide-react';
import {
  getOrCreateShareToken,
  getActiveShareToken,
  revokeShareToken,
  fetchCollaborators,
  inviteCollaborator,
  removeCollaborator,
  updateCollaboratorRole,
} from '../lib/data';
import type { SessionShare, CollaboratorWithProfile, CollaboratorRole } from '../lib/types';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { buildShareableUrl } from '../lib/urls';

async function sendCollaboratorInviteEmail(
  to: string,
  inviterEmail: string,
  sessionName: string,
  role: CollaboratorRole,
  accessToken: string,
  publicShareUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const appUrl = 'https://grc-ux-lab.netlify.app';
  const roleLabel = role === 'editor' ? 'Editor' : 'Viewer';
  const roleDesc =
    role === 'editor'
      ? 'view and edit tasks, manage participants, and contribute to this session'
      : 'view session details, tasks, and track progress in read-only mode';
  const loginLink = `${appUrl}/login`;
  const signUpLink = `${appUrl}/signup`;

  const publicLinkSection = publicShareUrl
    ? `\nOr view this session without signing in (public link):\n${publicShareUrl}\n`
    : '';

  const inviteMessage = `Hi there,

${inviterEmail} has invited you to access the following session on Mitratech UX:

  Session: ${sessionName}
  Your role: ${roleLabel}

As a ${roleLabel}, you will be able to ${roleDesc}.

Sign in to get started: ${loginLink}

New to Mitratech UX? Create a free account: ${signUpLink}
${publicLinkSection}
---
You received this email because ${inviterEmail} invited you to a session on Mitratech UX. If you weren't expecting this, you can safely ignore this message.`;

  const htmlMessage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>You've been invited</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#0f172a;border-radius:10px;padding:10px 20px;">
                    <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.5px;">Mitratech UX</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08),0 4px 16px rgba(0,0,0,0.06);overflow:hidden;">

              <!-- Top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(90deg,#0ea5e9 0%,#0284c7 100%);height:4px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:40px 48px;">

                    <!-- Icon + headline -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="padding-right:16px;vertical-align:middle;">
                          <div style="width:48px;height:48px;background-color:#e0f2fe;border-radius:12px;display:inline-block;text-align:center;line-height:48px;font-size:22px;">&#128101;</div>
                        </td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Collaboration Invite</p>
                          <h1 style="margin:4px 0 0;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">You've been invited</h1>
                        </td>
                      </tr>
                    </table>

                    <!-- Intro text -->
                    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
                      <a href="mailto:${inviterEmail}" style="color:#0284c7;text-decoration:none;font-weight:600;">${inviterEmail}</a>
                      has invited you to collaborate on a session in Mitratech UX.
                    </p>

                    <!-- Session info box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                      <tr>
                        <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px 24px;">
                          <table cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                            <tr>
                              <td style="padding-right:8px;vertical-align:top;padding-top:2px;">
                                <div style="width:8px;height:8px;background-color:#0ea5e9;border-radius:50%;margin-top:5px;"></div>
                              </td>
                              <td>
                                <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Session</p>
                                <p style="margin:2px 0 0;font-size:16px;font-weight:700;color:#0f172a;">${sessionName}</p>
                              </td>
                            </tr>
                          </table>
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding-right:8px;vertical-align:top;padding-top:2px;">
                                <div style="width:8px;height:8px;background-color:#10b981;border-radius:50%;margin-top:5px;"></div>
                              </td>
                              <td>
                                <p style="margin:0;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Your Role</p>
                                <p style="margin:2px 0 0;font-size:15px;font-weight:600;color:#0f172a;">${roleLabel}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Role description -->
                    <p style="margin:0 0 32px;font-size:14px;color:#64748b;line-height:1.65;background-color:#f0f9ff;border-left:3px solid #0ea5e9;padding:12px 16px;border-radius:0 8px 8px 0;">
                      As a <strong style="color:#0284c7;">${roleLabel}</strong>, you will be able to ${roleDesc}.
                    </p>

                    <!-- CTA Button -->
                    <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="background-color:#0284c7;border-radius:8px;">
                          <a href="${loginLink}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Sign In to Get Started</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Sign up link -->
                    <p style="margin:0 0 ${publicShareUrl ? '28px' : '0'};font-size:13px;color:#94a3b8;">
                      New to Mitratech UX?
                      <a href="${signUpLink}" style="color:#0284c7;text-decoration:none;font-weight:500;">Create a free account</a>
                    </p>

                    ${publicShareUrl ? `<!-- Public link section -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;">
                          <p style="margin:0 0 6px;font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Also available — No sign-in required</p>
                          <p style="margin:0 0 10px;font-size:13px;color:#475569;line-height:1.5;">This session has a public link. You can view it without creating an account.</p>
                          <a href="${publicShareUrl}" style="display:inline-block;font-size:13px;font-weight:600;color:#0284c7;text-decoration:none;background-color:#e0f2fe;padding:8px 16px;border-radius:6px;">View Public Session</a>
                        </td>
                      </tr>
                    </table>` : ''}

                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 8px 0;">
              <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;text-align:center;line-height:1.6;">
                You received this email because ${inviterEmail} invited you to a session on Mitratech UX.<br/>
                If you weren't expecting this, you can safely ignore this message.
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;text-align:center;">
                &copy; ${new Date().getFullYear()} Mitratech Holdings, Inc. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    const response = await fetch(`${supabaseUrl}/functions/v1/send-invitation-email`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to,
        subject: `${inviterEmail} invited you to collaborate on "${sessionName}"`,
        inviteMessage,
        htmlMessage,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('Failed to send invitation email:', err);
      return { ok: false, error: 'Email delivery failed.' };
    }
    return { ok: true };
  } catch (err) {
    console.error('sendCollaboratorInviteEmail error:', err);
    return { ok: false, error: 'Email delivery failed.' };
  }
}

interface ShareModalProps {
  sessionId: string;
  sessionName: string;
  onClose: () => void;
}

type ModalTab = 'link' | 'collaborators';

function buildShareUrl(token: string): string {
  return buildShareableUrl(`/share/${token}`);
}

export default function ShareModal({ sessionId, sessionName, onClose }: ShareModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ModalTab>('link');

  const [shareToken, setShareToken] = useState<SessionShare | null>(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [revokingToken, setRevokingToken] = useState(false);
  const [copied, setCopied] = useState(false);

  const [collaborators, setCollaborators] = useState<CollaboratorWithProfile[]>([]);
  const [loadingCollabs, setLoadingCollabs] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [emailSendWarning, setEmailSendWarning] = useState<string | null>(null);
  const [emailSendSuccess, setEmailSendSuccess] = useState<string | null>(null);

  const loadToken = useCallback(async () => {
    setLoadingToken(true);
    try {
      const token = await getActiveShareToken(sessionId);
      setShareToken(token);
    } finally {
      setLoadingToken(false);
    }
  }, [sessionId]);

  const loadCollaborators = useCallback(async () => {
    setLoadingCollabs(true);
    try {
      const data = await fetchCollaborators(sessionId);
      setCollaborators(data);
    } finally {
      setLoadingCollabs(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadToken();
    loadCollaborators();
  }, [loadToken, loadCollaborators]);

  async function handleGenerateLink() {
    if (!user) return;
    setGeneratingToken(true);
    try {
      const token = await getOrCreateShareToken(sessionId, user.id);
      setShareToken(token);
    } finally {
      setGeneratingToken(false);
    }
  }

  async function handleRevokeLink() {
    if (!shareToken) return;
    if (!confirm('Revoke this link? Anyone with the link will lose access immediately.')) return;
    setRevokingToken(true);
    try {
      await revokeShareToken(shareToken.id);
      setShareToken(null);
    } finally {
      setRevokingToken(false);
    }
  }

  async function handleCopyLink() {
    if (!shareToken) return;
    await navigator.clipboard.writeText(buildShareUrl(shareToken.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !inviteEmail.trim()) return;
    setInviteError(null);
    setEmailSendWarning(null);
    setEmailSendSuccess(null);
    setInviting(true);
    try {
      const email = inviteEmail.trim().toLowerCase();
      await inviteCollaborator(sessionId, email, inviteRole, user.id);
      setInviteEmail('');
      await loadCollaborators();

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? '';
      const inviterEmail = user.email ?? '';
      const publicShareUrl = shareToken ? buildShareUrl(shareToken.token) : undefined;
      const emailResult = await sendCollaboratorInviteEmail(email, inviterEmail, sessionName, inviteRole, accessToken, publicShareUrl);
      if (!emailResult.ok) {
        setEmailSendWarning(`Collaborator added, but the invitation email could not be delivered. You can ask them to sign in at https://grc-ux-lab.netlify.app/login.`);
      } else {
        setEmailSendSuccess(`Collaborator added and invitation email sent to ${email}.`);
        setTimeout(() => setEmailSendSuccess(null), 5000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('duplicate') || msg.includes('unique')) {
        setInviteError('This person has already been invited to this session.');
      } else {
        setInviteError('Failed to send invite. Please try again.');
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(collaboratorId: string) {
    setRemovingId(collaboratorId);
    try {
      await removeCollaborator(collaboratorId);
      setCollaborators((prev) => prev.filter((c) => c.id !== collaboratorId));
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRoleChange(collaboratorId: string, role: CollaboratorRole) {
    try {
      await updateCollaboratorRole(collaboratorId, role);
      setCollaborators((prev) =>
        prev.map((c) => (c.id === collaboratorId ? { ...c, role } : c))
      );
    } catch {
      // silently ignore; the UI will reflect old value
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-900">Share Session</h2>
            <p className="text-xs text-slate-500 truncate max-w-xs">{sessionName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 px-6">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-2 px-3 py-3.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'link'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Link2 className="w-4 h-4" />
            Public Link
          </button>
          <button
            onClick={() => setActiveTab('collaborators')}
            className={`flex items-center gap-2 px-3 py-3.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === 'collaborators'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            Collaborators
            {collaborators.length > 0 && (
              <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">
                {collaborators.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'link' && (
            <div className="space-y-5">
              <div className="bg-slate-50 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-500 leading-relaxed">
                  Anyone with this link can view this session without signing in. The link stays
                  active until you revoke it.
                </p>
              </div>

              {loadingToken ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                </div>
              ) : shareToken ? (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                    Share Link
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 min-w-0">
                      <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-600 truncate font-mono">
                        {buildShareUrl(shareToken.token)}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                        copied
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      Link is active
                    </span>
                    <button
                      onClick={handleRevokeLink}
                      disabled={revokingToken}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium transition-colors disabled:opacity-50"
                    >
                      {revokingToken ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Revoke link
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Link2 className="w-6 h-6 text-blue-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">No public link yet</p>
                  <p className="text-xs text-slate-500 mb-4">
                    Generate a link to share this session with anyone — no sign-in required.
                  </p>
                  <button
                    onClick={handleGenerateLink}
                    disabled={generatingToken}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm mx-auto transition-colors disabled:opacity-70"
                  >
                    {generatingToken ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Generate Public Link
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'collaborators' && (
            <div className="space-y-5">
              <form onSubmit={handleInvite} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Invite by Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as CollaboratorRole)}
                    className="text-sm border border-slate-200 rounded-lg px-2.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-70 shrink-0"
                  >
                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Invite
                  </button>
                </div>

                {inviteError && (
                  <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {inviteError}
                  </div>
                )}

                {emailSendWarning && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {emailSendWarning}
                  </div>
                )}

                {emailSendSuccess && (
                  <div className="flex items-start gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <Check className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {emailSendSuccess}
                  </div>
                )}

                <p className="text-xs text-slate-400">
                  <strong className="text-slate-500">Viewer</strong> — read-only access &nbsp;·&nbsp;{' '}
                  <strong className="text-slate-500">Editor</strong> — can toggle tasks and manage participants
                </p>
              </form>

              <div className="border-t border-slate-100 pt-4">
                {loadingCollabs ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                  </div>
                ) : collaborators.length === 0 ? (
                  <div className="text-center py-4">
                    <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">No collaborators yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      {collaborators.length} {collaborators.length === 1 ? 'collaborator' : 'collaborators'}
                    </p>
                    {collaborators.map((c) => (
                      <CollaboratorRow
                        key={c.id}
                        collaborator={c}
                        removing={removingId === c.id}
                        onRemove={handleRemove}
                        onRoleChange={handleRoleChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface CollaboratorRowProps {
  collaborator: CollaboratorWithProfile;
  removing: boolean;
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: CollaboratorRole) => void;
}

function CollaboratorRow({ collaborator, removing, onRemove, onRoleChange }: CollaboratorRowProps) {
  const initials = collaborator.invitee_email.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 bg-slate-50 rounded-xl">
      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
        <span className="text-xs font-bold text-blue-700">{initials}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{collaborator.invitee_email}</p>
        {!collaborator.invitee_user_id && (
          <p className="text-xs text-amber-600">Not registered yet</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onRoleChange(collaborator.id, collaborator.role === 'viewer' ? 'editor' : 'viewer')}
          title={`Switch to ${collaborator.role === 'viewer' ? 'editor' : 'viewer'}`}
          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors ${
            collaborator.role === 'editor'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
          }`}
        >
          {collaborator.role === 'editor' ? (
            <Pencil className="w-3 h-3" />
          ) : (
            <Eye className="w-3 h-3" />
          )}
          {collaborator.role}
        </button>
        <button
          onClick={() => onRemove(collaborator.id)}
          disabled={removing}
          title="Remove collaborator"
          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {removing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
