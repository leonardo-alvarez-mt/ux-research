import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  CheckSquare,
  Download,
  Hash,
  List,
  Loader2,
  Mail,
  MessageSquare,
  Star,
  Text,
  Type,
  Users,
} from 'lucide-react';
import { fetchSurveyById, fetchSurveyQuestions, fetchSurveyResponses, fetchSurveyResponseAnswers } from '../lib/data';
import type { Survey, SurveyQuestion, SurveyResponse, SurveyResponseAnswer } from '../lib/types';
import GoogleSheetsPanel from '../components/GoogleSheetsPanel';

interface SurveyResultsPageProps {
  surveyId: string;
  onBack: () => void;
  oauthClaimToken?: string;
}

type Tab = 'summary' | 'responses';
type SortDir = 'asc' | 'desc';

const NON_ANSWER_TYPES = new Set([
  'welcome_screen',
  'statement',
  'end_screen',
]);

function getTypeIcon(type: string) {
  switch (type) {
    case 'short_text': return <Type className="w-3.5 h-3.5" />;
    case 'long_text': return <Text className="w-3.5 h-3.5" />;
    case 'multiple_choice': return <CheckSquare className="w-3.5 h-3.5" />;
    case 'single_choice': return <List className="w-3.5 h-3.5" />;
    case 'rating': return <Star className="w-3.5 h-3.5" />;
    case 'email': return <Mail className="w-3.5 h-3.5" />;
    case 'number': return <Hash className="w-3.5 h-3.5" />;
    default: return <MessageSquare className="w-3.5 h-3.5" />;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAnswerDisplay(q: SurveyQuestion, val: unknown): string {
  if (val === undefined || val === null) return '';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'number') return String(val);
  return String(val).trim();
}

function exportCSV(survey: Survey, questions: SurveyQuestion[], responses: SurveyResponse[], allAnswers: SurveyResponseAnswer[]) {
  const answerableQuestions = questions.filter((q) => !NON_ANSWER_TYPES.has(q.type));

  function escapeCsv(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  const headers = ['Submitted At', ...answerableQuestions.map((q) => q.title || 'Untitled')];
  const rows: string[][] = [headers];

  for (const response of responses) {
    const responseAnswers = allAnswers.filter((a) => a.response_id === response.id);
    const row: string[] = [formatDate(response.submitted_at)];
    for (const q of answerableQuestions) {
      const ans = responseAnswers.find((a) => a.question_id === q.id);
      const val = ans?.answer?.value;
      let display = '';
      if (Array.isArray(val)) {
        display = val.join(' | ');
      } else if (typeof val === 'number') {
        display = String(val);
      } else {
        display = String(val ?? '').trim();
      }
      row.push(display);
    }
    rows.push(row);
  }

  const csv = rows.map((r) => r.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = survey.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `${slug}-responses-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SurveyResultsPage({ surveyId, onBack, oauthClaimToken }: SurveyResultsPageProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [allAnswers, setAllAnswers] = useState<SurveyResponseAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('summary');

  useEffect(() => {
    load();
  }, [surveyId]);

  async function load() {
    setLoading(true);
    try {
      const [s, qs, rs] = await Promise.all([
        fetchSurveyById(surveyId),
        fetchSurveyQuestions(surveyId),
        fetchSurveyResponses(surveyId),
      ]);
      setSurvey(s);
      setQuestions(qs);
      setResponses(rs);

      if (rs.length > 0) {
        const answerArrays = await Promise.all(rs.map((r) => fetchSurveyResponseAnswers(r.id)));
        setAllAnswers(answerArrays.flat());
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">Survey not found.</p>
      </div>
    );
  }

  const answerableQuestions = questions.filter((q) => !NON_ANSWER_TYPES.has(q.type));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate leading-tight">{survey.title}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Survey Results</p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">{responses.length}</span>
              <span className="text-xs text-slate-400">response{responses.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-5xl mx-auto mt-4">
          <div className="flex gap-1 border-b border-transparent">
            <button
              onClick={() => setTab('summary')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px ${
                tab === 'summary'
                  ? 'text-slate-900 border-slate-900 bg-slate-50'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setTab('responses')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all border-b-2 -mb-px flex items-center gap-2 ${
                tab === 'responses'
                  ? 'text-slate-900 border-slate-900 bg-slate-50'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              Responses
              {responses.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  tab === 'responses' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {responses.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {responses.length === 0 ? (
          <div className="max-w-5xl mx-auto px-6 py-12">
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-slate-800 font-semibold mb-2">No responses yet</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto leading-relaxed">
                {survey.status === 'published'
                  ? 'Share the survey link to start collecting responses.'
                  : 'Publish the survey first, then share the link to collect responses.'}
              </p>
            </div>
          </div>
        ) : tab === 'summary' ? (
          <div className="max-w-5xl mx-auto px-6 py-6">
            <SummaryTab questions={questions} responses={responses} allAnswers={allAnswers} />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto px-6 py-6">
            <ResponsesTab
              survey={survey}
              questions={answerableQuestions}
              responses={responses}
              allAnswers={allAnswers}
              oauthClaimToken={oauthClaimToken}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Summary Tab
// ============================================================

function SummaryTab({
  questions,
  responses,
  allAnswers,
}: {
  questions: SurveyQuestion[];
  responses: SurveyResponse[];
  allAnswers: SurveyResponseAnswer[];
}) {
  const answerableQuestions = questions.filter((q) => !NON_ANSWER_TYPES.has(q.type));

  if (answerableQuestions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm">No questions in this survey.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {answerableQuestions.map((q) => {
        const qAnswers = allAnswers.filter((a) => a.question_id === q.id);
        return (
          <QuestionSummaryCard key={q.id} question={q} answers={qAnswers} totalResponses={responses.length} />
        );
      })}
    </div>
  );
}

function QuestionSummaryCard({
  question,
  answers,
  totalResponses,
}: {
  question: SurveyQuestion;
  answers: SurveyResponseAnswer[];
  totalResponses: number;
}) {
  const answered = answers.filter((a) => {
    const v = a.answer?.value;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'number') return true;
    return String(v ?? '').trim().length > 0;
  });

  const responseRate = totalResponses > 0 ? Math.round((answered.length / totalResponses) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0 text-slate-500 mt-0.5">
            {getTypeIcon(question.type)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 leading-snug">
              {question.title || <span className="italic text-slate-400">Untitled question</span>}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {answered.length} of {totalResponses} answered
            </p>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className="text-sm font-bold text-slate-700">{responseRate}%</span>
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${responseRate}%` }}
            />
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <QuestionAggregate question={question} answers={answered} />
      </div>
    </div>
  );
}

function QuestionAggregate({ question, answers }: { question: SurveyQuestion; answers: SurveyResponseAnswer[] }) {
  if (answers.length === 0) {
    return <p className="text-xs text-slate-400 italic">No answers yet</p>;
  }

  if (question.type === 'rating') {
    const nums = answers.map((a) => Number(a.answer?.value ?? 0)).filter((n) => n > 0);
    const avg = nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
    const max = question.settings?.ratingMax ?? 5;
    return (
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {Array.from({ length: max }).map((_, i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${i < Math.round(avg) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
            />
          ))}
        </div>
        <span className="text-sm font-bold text-slate-800">{avg.toFixed(1)}</span>
        <span className="text-xs text-slate-400">/ {max} average</span>
      </div>
    );
  }

  if (question.type === 'single_choice' || question.type === 'multiple_choice') {
    const choices = question.settings?.choices ?? [];
    const counts: Record<string, number> = {};
    for (const choice of choices) counts[choice] = 0;
    for (const a of answers) {
      const v = a.answer?.value;
      if (Array.isArray(v)) {
        for (const c of v) { counts[c] = (counts[c] ?? 0) + 1; }
      } else {
        counts[String(v)] = (counts[String(v)] ?? 0) + 1;
      }
    }
    const total = answers.length;
    const sortedChoices = [...choices].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
    const maxCount = sortedChoices.length > 0 ? (counts[sortedChoices[0]] ?? 0) : 0;
    return (
      <div className="space-y-2.5">
        {sortedChoices.map((choice) => {
          const count = counts[choice] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const isTop = count === maxCount && maxCount > 0;
          return (
            <div key={choice}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-medium ${isTop ? 'text-slate-800' : 'text-slate-600'}`}>{choice}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{count}</span>
                  <span className={`text-xs font-semibold ${isTop ? 'text-blue-600' : 'text-slate-500'}`}>{pct}%</span>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isTop ? 'bg-blue-500' : 'bg-slate-300'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const textAnswers = answers
    .map((a) => String(a.answer?.value ?? '').trim())
    .filter(Boolean);
  return (
    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
      {textAnswers.map((text, i) => (
        <div key={i} className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-100 leading-relaxed">
          {text}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Responses Tab — spreadsheet table
// ============================================================

function ResponsesTab({
  survey,
  questions,
  responses,
  allAnswers,
  oauthClaimToken,
}: {
  survey: Survey;
  questions: SurveyQuestion[];
  responses: SurveyResponse[];
  allAnswers: SurveyResponseAnswer[];
  oauthClaimToken?: string;
}) {
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const tableRef = useRef<HTMLDivElement>(null);

  const sorted = [...responses].sort((a, b) => {
    const diff = new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
    return sortDir === 'asc' ? diff : -diff;
  });

  const answerMap = new Map<string, Map<string, SurveyResponseAnswer>>();
  for (const ans of allAnswers) {
    if (!answerMap.has(ans.response_id)) {
      answerMap.set(ans.response_id, new Map());
    }
    answerMap.get(ans.response_id)!.set(ans.question_id, ans);
  }

  function toggleSort() {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
  }

  function SortIcon() {
    if (sortDir === 'asc') return <ArrowUp className="w-3 h-3" />;
    if (sortDir === 'desc') return <ArrowDown className="w-3 h-3" />;
    return <ArrowUpDown className="w-3 h-3" />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportCSV(survey, questions, responses, allAnswers)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <GoogleSheetsPanel surveyId={survey.id} surveyTitle={survey.title} oauthClaimToken={oauthClaimToken} />
        </div>
        <span className="text-xs text-slate-400 font-medium">
          {responses.length} response{responses.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white"
      >
        <table className="w-full text-sm border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              <th
                className="sticky left-0 z-10 bg-slate-50/80 px-4 py-3 text-left whitespace-nowrap border-r border-slate-200 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                onClick={toggleSort}
                style={{ minWidth: 160 }}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <SortIcon />
                  Submitted At
                </div>
              </th>
              {questions.map((q) => (
                <th
                  key={q.id}
                  className="px-4 py-3 text-left whitespace-nowrap border-r border-slate-100 last:border-r-0"
                  style={{ minWidth: 180, maxWidth: 280 }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 shrink-0">{getTypeIcon(q.type)}</span>
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{q.title || 'Untitled'}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((response, idx) => {
              const responseAnswers = answerMap.get(response.id);
              return (
                <tr
                  key={response.id}
                  className="group border-b border-slate-100 last:border-b-0 hover:bg-blue-50/30 transition-colors"
                >
                  <td
                    className={`sticky left-0 z-10 px-4 py-3 whitespace-nowrap border-r border-slate-200 transition-colors group-hover:bg-blue-50/30 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    }`}
                  >
                    <span className="text-xs text-slate-500 font-medium">{formatDate(response.submitted_at)}</span>
                  </td>
                  {questions.map((q) => {
                    const ans = responseAnswers?.get(q.id);
                    const val = ans?.answer?.value;
                    const display = formatAnswerDisplay(q, val);
                    return (
                      <td
                        key={q.id}
                        className="px-4 py-3 border-r border-slate-100 last:border-r-0 align-middle"
                        style={{ maxWidth: 280 }}
                      >
                        {display ? (
                          q.type === 'rating' ? (
                            <div className="flex items-center gap-1">
                              {Array.from({ length: q.settings?.ratingMax ?? 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < Number(val) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                                />
                              ))}
                              <span className="text-xs text-slate-400 ml-1">{val}</span>
                            </div>
                          ) : (
                            <span className="block text-sm text-slate-700 truncate" title={display}>{display}</span>
                          )
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
