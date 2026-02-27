import { useState, useRef } from 'react';
import { Mail, X, Plus, Send, CheckCircle, AlertCircle, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { sendCwgEmail, markCwgRecapSent, markCwgFollowupSent } from '../lib/data';
import { useAuth } from '../context/AuthContext';
import type { Session, CwgSessionMeta, SessionParticipantWithDetails, Task } from '../lib/types';

type EmailType = 'reminder' | 'recap' | 'followup';

interface CwgEmailPanelProps {
  session: Session;
  cwgMeta: CwgSessionMeta;
  participants: SessionParticipantWithDetails[];
  tasks: Task[];
  onMetaUpdated: () => void;
}

function buildReminderPlain(session: Session, cwgMeta: CwgSessionMeta): string {
  const dateStr = new Date(session.test_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const tz = cwgMeta.timezone ?? 'your local time zone';
  const link = cwgMeta.meeting_link ?? '[Meeting Link]';
  return `Hi Everyone,

This email is a friendly reminder that the Client Working Group Call for "${session.name}" is scheduled for ${dateStr} [Time] ${tz}.

The agenda for the call will include the following:
  - Review of Previous Meeting Action Items
    • Status updates on outstanding items
    • Discussion of any blockers or challenges
  - Feature Demonstration and Feedback
    • Walkthrough of new functionality
    • Client feedback and validation session
  - Upcoming Sprint Planning
    • Priority features and timeline discussion
    • Resource allocation and dependencies

Your presence and feedback are important to us. Please mark your calendar and ensure you are available at the scheduled time.

Meeting Details:
Date: ${dateStr} [Time] ${tz}
Link: ${link}

If you have any questions, please do not hesitate to reach out.

Thanks,
[Your Name]
Mitratech UX Team`;
}

function buildReminderHtml(session: Session, cwgMeta: CwgSessionMeta): string {
  const dateStr = new Date(session.test_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const tz = cwgMeta.timezone ?? 'your local time zone';
  const link = cwgMeta.meeting_link;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <tr><td style="background:#0f766e;padding:24px 32px;">
        <p style="margin:0;color:#fff;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Mitratech UX</p>
        <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700;">Client Working Group Reminder</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;color:#334155;font-size:15px;">Hi Everyone,</p>
        <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
          This is a friendly reminder that the Client Working Group Call for <strong>"${session.name}"</strong>
          is scheduled for <strong>${dateStr}</strong> [Time] <strong>${tz}</strong>.
        </p>
        <div style="background:#f0fdfa;border-left:4px solid #0f766e;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
          <p style="margin:0 0 8px;color:#0f766e;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Agenda</p>
          <ul style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.8;">
            <li><strong>Review of Previous Meeting Action Items</strong>
              <ul style="margin:4px 0;"><li>Status updates on outstanding items</li><li>Discussion of any blockers</li></ul>
            </li>
            <li><strong>Feature Demonstration and Feedback</strong>
              <ul style="margin:4px 0;"><li>Walkthrough of new functionality</li><li>Client feedback and validation session</li></ul>
            </li>
            <li><strong>Upcoming Sprint Planning</strong>
              <ul style="margin:4px 0;"><li>Priority features and timeline discussion</li><li>Resource allocation and dependencies</li></ul>
            </li>
          </ul>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0 0 12px;color:#0f766e;font-size:13px;font-weight:600;">Meeting Details</p>
          <p style="margin:0 0 6px;color:#475569;font-size:14px;">📅 <strong>${dateStr}</strong> [Time] ${tz}</p>
          ${link ? `<p style="margin:0;color:#475569;font-size:14px;">🔗 <a href="${link}" style="color:#0f766e;">${link}</a></p>` : ''}
        </div>
        <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
          Your presence and feedback are important to us. Please mark your calendar and ensure you are available at the scheduled time.
        </p>
        <p style="margin:0;color:#64748b;font-size:13px;">
          Thanks,<br/>
          <strong>[Your Name]</strong><br/>
          Mitratech UX Team
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">Mitratech &copy; ${new Date().getFullYear()}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildRecapPlain(session: Session, cwgMeta: CwgSessionMeta, tasks: Task[]): string {
  const openItems = tasks.filter((t) => !t.is_completed);
  const actionItems = openItems.slice(0, 8).map((t, i) => `${i + 1}. ${t.title} — Due: ${t.due_date}`).join('\n');
  const recLink = cwgMeta.recording_link ?? '[Meeting Recording Link]';
  const recPass = cwgMeta.recording_passcode ?? '[Recording Passcode]';

  return `Hi Everyone,

Thank you for joining our Client Working Group session for "${session.name}". Please find the recording, action items, and meeting minutes below.

Recording
${recLink}
Passcode: ${recPass}

Chapters
00:00 Meeting introduction and agenda overview
05:15 Previous action items review
12:30 Feature demonstration and walkthrough
25:45 Client feedback and discussion
38:20 Upcoming sprint priorities
52:30 Next steps and action items assignment

Action Items
${actionItems || 'No open action items.'}

Summary
During the meeting, the team discussed current progress, upcoming milestones, and gathered valuable client feedback on the proposed features.

Key Achievements
The team successfully demonstrated the latest feature implementations and received positive feedback from client stakeholders.

Areas for Focus
- Prioritize user experience improvements based on client feedback
- Address technical requirements and integration considerations
- Establish timeline for next phase deliverables

Feel free to reach out with questions.

Thanks,
[Your Name]
Mitratech UX Team`;
}

function buildRecapHtml(session: Session, cwgMeta: CwgSessionMeta, tasks: Task[]): string {
  const openItems = tasks.filter((t) => !t.is_completed);
  const recLink = cwgMeta.recording_link ?? '[Meeting Recording Link]';
  const recPass = cwgMeta.recording_passcode ?? '[Recording Passcode]';

  const actionItemsHtml = openItems.length > 0
    ? openItems.slice(0, 8).map((t, i) => `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:700;width:32px;">${i + 1}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;">${t.title}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;white-space:nowrap;">${t.due_date}</td>
        </tr>`).join('')
    : '<tr><td colspan="3" style="padding:12px;color:#94a3b8;font-size:14px;text-align:center;">No open action items.</td></tr>';

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <tr><td style="background:#0f766e;padding:24px 32px;">
        <p style="margin:0;color:#ccfbf1;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Mitratech UX</p>
        <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700;">${session.name} — Meeting Minutes</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;color:#334155;font-size:15px;">Hi Everyone,</p>
        <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
          Thank you for joining our Client Working Group session. Please find the recording, action items, and meeting minutes below.
        </p>

        <h2 style="margin:0 0 12px;color:#0f766e;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Recording</h2>
        <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
          <p style="margin:0 0 4px;font-size:14px;">🔗 <a href="${recLink}" style="color:#0f766e;font-weight:600;">${recLink}</a></p>
          <p style="margin:0;color:#475569;font-size:13px;">Passcode: ${recPass}</p>
        </div>

        <h2 style="margin:0 0 12px;color:#0f766e;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Action Items</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">#</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">Item</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600;">Due</th>
            </tr>
          </thead>
          <tbody>${actionItemsHtml}</tbody>
        </table>

        <h2 style="margin:0 0 12px;color:#0f766e;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Summary</h2>
        <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
          During the meeting, the team discussed current progress, upcoming milestones, and gathered valuable client feedback on the proposed features.
        </p>

        <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0 0 10px;color:#334155;font-size:14px;font-weight:600;">Areas for Focus</p>
          <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
            <li>Prioritize user experience improvements based on client feedback</li>
            <li>Address technical requirements and integration considerations</li>
            <li>Establish timeline for next phase deliverables</li>
          </ul>
        </div>

        <p style="margin:0;color:#64748b;font-size:13px;">
          Feel free to reach out with questions.<br/><br/>
          Thanks,<br/>
          <strong>[Your Name]</strong><br/>
          Mitratech UX Team
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">Mitratech &copy; ${new Date().getFullYear()}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function buildFollowupPlain(session: Session, tasks: Task[]): string {
  const openItems = tasks.filter((t) => !t.is_completed);
  const items = openItems.slice(0, 6).map((t, i) => `${i + 1}. ${t.title} (Due: ${t.due_date})`).join('\n');
  return `Hi Everyone,

This is a follow-up from our Client Working Group session for "${session.name}".

We wanted to check in on the action items from our meeting:

${items || 'Please review the action items discussed during our session.'}

Please let us know if you have any blockers, concerns, or updates on the above items.

We look forward to continuing this collaboration and will be in touch to schedule our next session.

Thanks,
[Your Name]
Mitratech UX Team`;
}

function buildFollowupHtml(session: Session, tasks: Task[]): string {
  const openItems = tasks.filter((t) => !t.is_completed);
  const itemsHtml = openItems.slice(0, 6).map((t, i) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;font-weight:700;width:28px;">${i + 1}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#334155;font-size:14px;">${t.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:13px;">${t.due_date}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <tr><td style="background:#0f766e;padding:24px 32px;">
        <p style="margin:0;color:#ccfbf1;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Mitratech UX</p>
        <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700;">CWG Follow-Up — ${session.name}</h1>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;color:#334155;font-size:15px;">Hi Everyone,</p>
        <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
          This is a follow-up from our Client Working Group session for <strong>"${session.name}"</strong>.
          We wanted to check in on the outstanding action items from our meeting.
        </p>
        <h2 style="margin:0 0 12px;color:#0f766e;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Outstanding Action Items</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
          ${itemsHtml || '<tr><td colspan="3" style="padding:12px;color:#94a3b8;font-size:14px;text-align:center;">All action items resolved.</td></tr>'}
        </table>
        <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
          Please let us know if you have any blockers, concerns, or updates. We look forward to continuing this collaboration.
        </p>
        <p style="margin:0;color:#64748b;font-size:13px;">
          Thanks,<br/>
          <strong>[Your Name]</strong><br/>
          Mitratech UX Team
        </p>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">Mitratech &copy; ${new Date().getFullYear()}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

const EMAIL_TYPE_CONFIG: Record<EmailType, { label: string; subjectTemplate: (name: string) => string }> = {
  reminder: {
    label: 'Meeting Reminder',
    subjectTemplate: (name) => `Friendly reminder for Client Working Group Call — ${name}`,
  },
  recap: {
    label: 'Meeting Recap',
    subjectTemplate: (name) => `${name} — Client Working Group Meeting Minutes`,
  },
  followup: {
    label: '1-Week Follow-Up',
    subjectTemplate: (name) => `${name} — CWG Follow-Up: Action Items Check-In`,
  },
};

interface EmailChipInputProps {
  label: string;
  emails: string[];
  onAdd: (email: string) => void;
  onRemove: (email: string) => void;
}

function EmailChipInput({ label, emails, onAdd, onRemove }: EmailChipInputProps) {
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && inputVal.trim()) {
      e.preventDefault();
      const email = inputVal.trim().replace(/,$/, '');
      if (email && !emails.includes(email)) onAdd(email);
      setInputVal('');
    } else if (e.key === 'Backspace' && !inputVal && emails.length > 0) {
      onRemove(emails[emails.length - 1]);
    }
  }

  function handleBlur() {
    const email = inputVal.trim();
    if (email && !emails.includes(email)) onAdd(email);
    setInputVal('');
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <div
        className="min-h-[42px] flex flex-wrap gap-1.5 px-3 py-2 border border-slate-200 rounded-lg cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all"
        onClick={() => inputRef.current?.focus()}
      >
        {emails.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium px-2 py-1 rounded-md"
          >
            {email}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(email); }}
              className="text-teal-400 hover:text-teal-700 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="email"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={emails.length === 0 ? 'Add email, press Enter...' : ''}
          className="flex-1 min-w-[140px] text-sm outline-none bg-transparent placeholder:text-slate-400 py-0.5"
        />
      </div>
    </div>
  );
}

export default function CwgEmailPanel({
  session,
  cwgMeta,
  participants,
  tasks,
  onMetaUpdated,
}: CwgEmailPanelProps) {
  const { session: authSession } = useAuth();
  const [activeType, setActiveType] = useState<EmailType | null>(null);
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  function openComposer(type: EmailType) {
    const participantEmails = participants
      .map((p) => p.participant.email)
      .filter(Boolean);

    const config = EMAIL_TYPE_CONFIG[type];
    const subj = config.subjectTemplate(session.name);
    let plain = '';
    if (type === 'reminder') plain = buildReminderPlain(session, cwgMeta);
    else if (type === 'recap') plain = buildRecapPlain(session, cwgMeta, tasks);
    else plain = buildFollowupPlain(session, tasks);

    setActiveType(type);
    setToEmails(participantEmails);
    setCcEmails([]);
    setSubject(subj);
    setBody(plain);
    setSendResult(null);
  }

  function closeComposer() {
    setActiveType(null);
    setSendResult(null);
  }

  async function handleSend() {
    if (!authSession?.access_token) return;
    if (toEmails.length === 0) {
      setSendResult({ ok: false, message: 'Please add at least one recipient.' });
      return;
    }
    setSending(true);
    setSendResult(null);

    let htmlMessage = '';
    if (activeType === 'reminder') htmlMessage = buildReminderHtml(session, cwgMeta);
    else if (activeType === 'recap') htmlMessage = buildRecapHtml(session, cwgMeta, tasks);
    else htmlMessage = buildFollowupHtml(session, tasks);

    const result = await sendCwgEmail({
      type: activeType!,
      to: toEmails,
      cc: ccEmails,
      subject,
      htmlMessage,
      plainMessage: body,
      accessToken: authSession.access_token,
    });

    if (result.ok) {
      if (activeType === 'recap') {
        await markCwgRecapSent(session.id).catch(() => {});
        onMetaUpdated();
      } else if (activeType === 'followup') {
        await markCwgFollowupSent(session.id).catch(() => {});
        onMetaUpdated();
      }
      setSendResult({ ok: true, message: `${EMAIL_TYPE_CONFIG[activeType!].label} sent successfully!` });
    } else {
      setSendResult({ ok: false, message: result.error ?? 'Failed to send email.' });
    }
    setSending(false);
  }

  const meetingPassed = new Date(session.test_date + 'T23:59:59') < new Date();

  const emailTypes: { type: EmailType; disabled: boolean; disabledReason?: string }[] = [
    {
      type: 'reminder',
      disabled: meetingPassed,
      disabledReason: 'Meeting date has already passed',
    },
    {
      type: 'recap',
      disabled: !meetingPassed,
      disabledReason: 'Available after the meeting date',
    },
    {
      type: 'followup',
      disabled: !meetingPassed,
      disabledReason: 'Available after the meeting date',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
          <Mail className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Email Communications</h3>
          <p className="text-xs text-slate-500">Send structured emails to all participants and stakeholders</p>
        </div>
      </div>

      {!activeType ? (
        <div className="p-4 space-y-2">
          {emailTypes.map(({ type, disabled, disabledReason }) => {
            const config = EMAIL_TYPE_CONFIG[type];
            const sentAt = type === 'recap' ? cwgMeta.recap_sent_at : type === 'followup' ? cwgMeta.followup_sent_at : null;
            return (
              <div
                key={type}
                className={`flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                  disabled
                    ? 'bg-slate-50 border-slate-100 opacity-60'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer'
                }`}
                onClick={!disabled ? () => openComposer(type) : undefined}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${disabled ? 'bg-slate-100' : 'bg-blue-100'}`}>
                    <Mail className={`w-3.5 h-3.5 ${disabled ? 'text-slate-400' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{config.label}</p>
                    {sentAt ? (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Sent {new Date(sentAt).toLocaleDateString()}
                      </p>
                    ) : disabled ? (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {disabledReason}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Click to compose and send</p>
                    )}
                  </div>
                </div>
                {!disabled && (
                  <button className="text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors flex items-center gap-1">
                    {sentAt ? 'Resend' : 'Compose'}
                    <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={closeComposer}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-slate-800">
                {EMAIL_TYPE_CONFIG[activeType].label}
              </span>
            </div>
            <button
              onClick={closeComposer}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {sendResult && (
            <div className={`flex items-start gap-2.5 rounded-lg px-4 py-3 ${sendResult.ok ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
              {sendResult.ok
                ? <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                : <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              }
              <p className={`text-sm ${sendResult.ok ? 'text-emerald-700' : 'text-red-700'}`}>{sendResult.message}</p>
            </div>
          )}

          <EmailChipInput
            label="To"
            emails={toEmails}
            onAdd={(e) => setToEmails((prev) => [...prev, e])}
            onRemove={(e) => setToEmails((prev) => prev.filter((x) => x !== e))}
          />

          <EmailChipInput
            label="CC (optional)"
            emails={ccEmails}
            onAdd={(e) => setCcEmails((prev) => [...prev, e])}
            onRemove={(e) => setCcEmails((prev) => prev.filter((x) => x !== e))}
          />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-600">Body</label>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Plus className="w-3 h-3" />
                HTML template sent automatically
              </span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-y"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={closeComposer}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || toEmails.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
