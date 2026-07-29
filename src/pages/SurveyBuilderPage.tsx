import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Hash,
  Loader2,
  Mail,
  Plus,
  Play,
  Star,
  Text,
  Trash2,
  Type,
  List,
  CheckSquare,
  Globe,
  Lock,
  FileQuestion,
} from 'lucide-react';
import {
  fetchSurveyById,
  fetchSurveyQuestions,
  updateSurvey,
  addSurveyQuestion,
  updateSurveyQuestion,
  deleteSurveyQuestion,
  reorderSurveyQuestions,
} from '../lib/data';
import type { Survey, SurveyQuestion, SurveyQuestionType } from '../lib/types';
import { buildShareableUrl } from '../lib/urls';
import AddContentModal from '../components/AddContentModal';
import SurveyPreviewModal from '../components/SurveyPreviewModal';

interface SurveyBuilderPageProps {
  surveyId: string;
  onBack: () => void;
  onViewResults: (surveyId: string) => void;
}

const CORE_QUESTION_TYPES: { type: SurveyQuestionType; label: string; icon: React.ReactNode }[] = [
  { type: 'short_text', label: 'Short Text', icon: <Type className="w-3.5 h-3.5" /> },
  { type: 'long_text', label: 'Long Text', icon: <Text className="w-3.5 h-3.5" /> },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: <CheckSquare className="w-3.5 h-3.5" /> },
  { type: 'single_choice', label: 'Single Choice', icon: <List className="w-3.5 h-3.5" /> },
  { type: 'rating', label: 'Rating', icon: <Star className="w-3.5 h-3.5" /> },
  { type: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
  { type: 'number', label: 'Number', icon: <Hash className="w-3.5 h-3.5" /> },
];

function getTypeIcon(type: SurveyQuestionType) {
  const found = CORE_QUESTION_TYPES.find((t) => t.type === type);
  return found?.icon ?? <FileQuestion className="w-3.5 h-3.5" />;
}

function getTypeLabel(type: SurveyQuestionType) {
  const found = CORE_QUESTION_TYPES.find((t) => t.type === type);
  if (found) return found.label;
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SurveyBuilderPage({ surveyId, onBack, onViewResults }: SurveyBuilderPageProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [showAddContent, setShowAddContent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [titleEditing, setTitleEditing] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragIndexRef = useRef<number | null>(null);
  const shareRef = useRef<HTMLDivElement>(null);
  const typeDropRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    load();
  }, [surveyId]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShowSharePopup(false);
      if (typeDropRef.current && !typeDropRef.current.contains(e.target as Node)) setShowTypeDropdown(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, qs] = await Promise.all([fetchSurveyById(surveyId), fetchSurveyQuestions(surveyId)]);
      setSurvey(s);
      setQuestions(qs);
      if (qs.length > 0) setSelectedId(qs[0].id);
    } finally {
      setLoading(false);
    }
  }

  const scheduleAutoSave = useCallback(
    (surveyFields?: Partial<Pick<Survey, 'title' | 'description' | 'status'>>) => {
      setSaved(false);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        if (!survey) return;
        setSaving(true);
        try {
          if (surveyFields) {
            const updated = await updateSurvey(surveyId, surveyFields);
            setSurvey(updated);
          }
        } finally {
          setSaving(false);
          setSaved(true);
        }
      }, 800);
    },
    [survey, surveyId]
  );

  async function handleAddQuestion(type: SurveyQuestionType) {
    const newOrder = questions.length > 0 ? Math.max(...questions.map((q) => q.sort_order)) + 1 : 0;
    const q = await addSurveyQuestion(surveyId, type, newOrder);
    setQuestions((prev) => [...prev, q]);
    setSelectedId(q.id);
  }

  async function handleDeleteQuestion(id: string) {
    await deleteSurveyQuestion(id);
    setQuestions((prev) => {
      const remaining = prev.filter((q) => q.id !== id);
      return remaining;
    });
    setSelectedId((prev) => {
      if (prev !== id) return prev;
      const idx = questions.findIndex((q) => q.id === id);
      const remaining = questions.filter((q) => q.id !== id);
      if (remaining.length === 0) return null;
      return remaining[Math.min(idx, remaining.length - 1)].id;
    });
  }

  async function handleQuestionFieldChange(id: string, fields: Partial<SurveyQuestion>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...fields } : q)));
    setSaved(false);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateSurveyQuestion(id, fields);
      } finally {
        setSaving(false);
        setSaved(true);
      }
    }, 800);
  }

  async function handleTogglePublish() {
    if (!survey) return;
    const newStatus = survey.status === 'published' ? 'draft' : 'published';
    const updated = await updateSurvey(surveyId, { status: newStatus });
    setSurvey(updated);
  }

  async function handleMoveQuestion(id: string, dir: 'up' | 'down') {
    const idx = questions.findIndex((q) => q.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === questions.length - 1) return;
    const newQs = [...questions];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [newQs[idx], newQs[swap]] = [newQs[swap], newQs[idx]];
    const reordered = newQs.map((q, i) => ({ ...q, sort_order: i }));
    setQuestions(reordered);
    await reorderSurveyQuestions(reordered.map((q) => ({ id: q.id, sort_order: q.sort_order })));
  }

  function handleCopyLink() {
    if (!survey) return;
    const url = buildShareableUrl(`/survey/${survey.share_token}`);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    setDragOverIndex(null);
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) return;
    dragIndexRef.current = null;

    const newQs = [...questions];
    const [removed] = newQs.splice(dragIndex, 1);
    newQs.splice(dropIndex, 0, removed);
    const reordered = newQs.map((q, i) => ({ ...q, sort_order: i }));
    setQuestions(reordered);
    await reorderSurveyQuestions(reordered.map((q) => ({ id: q.id, sort_order: q.sort_order })));
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  const selectedQ = questions.find((q) => q.id === selectedId) ?? null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">Survey not found.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-5 py-3 flex items-center gap-3 shrink-0 z-10">
        <button
          onClick={onBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {questions.length > 0 && (
          <>
            <button
              onClick={() => setShowAddContent(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add content
            </button>

            <div className="w-px h-5 bg-slate-200 shrink-0" />

            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              Preview
            </button>
          </>
        )}

        <div className="flex-1 min-w-0 flex justify-center">
          {titleEditing ? (
            <input
              autoFocus
              value={survey.title}
              onChange={(e) => {
                const t = e.target.value;
                setSurvey((s) => s ? { ...s, title: t } : s);
                scheduleAutoSave({ title: t });
              }}
              onBlur={() => setTitleEditing(false)}
              onKeyDown={(e) => { if (e.key === 'Enter') setTitleEditing(false); }}
              className="text-sm font-semibold text-slate-900 bg-transparent border-b border-blue-400 outline-none max-w-xs text-center"
            />
          ) : (
            <button
              onClick={() => setTitleEditing(true)}
              className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate max-w-xs block"
            >
              {survey.title || 'Untitled Survey'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            {saving ? (
              <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
            ) : saved ? (
              <><Check className="w-3 h-3 text-emerald-500" /> Saved</>
            ) : null}
          </span>

          <button
            onClick={() => onViewResults(surveyId)}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Results
          </button>

          <div className="relative" ref={shareRef}>
            <button
              onClick={() => {
                if (survey.status !== 'published') {
                  handleTogglePublish();
                } else {
                  setShowSharePopup((v) => !v);
                }
              }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                survey.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {survey.status === 'published' ? (
                <><Globe className="w-3.5 h-3.5" /> Share</>
              ) : (
                <><Lock className="w-3.5 h-3.5" /> Publish</>
              )}
            </button>
            {showSharePopup && survey.status === 'published' && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 p-4 z-50">
                <p className="text-xs font-semibold text-slate-700 mb-2">Share link</p>
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3">
                  <span className="text-xs text-slate-600 flex-1 truncate font-mono">
                    {buildShareableUrl(`/survey/${survey.share_token}`)}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="text-blue-600 hover:text-blue-700 shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  onClick={handleTogglePublish}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
                >
                  <Lock className="w-3 h-3" /> Unpublish survey
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Three-panel body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — question list */}
        <div className="w-60 shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto py-3">
            {questions.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-slate-400">No questions yet.</p>
              </div>
            ) : (
              <div className="px-2">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className="relative mb-1"
                  >
                    {dragOverIndex === idx && dragIndexRef.current !== null && dragIndexRef.current !== idx && (
                      <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-blue-400 rounded-full z-10" />
                    )}
                    <button
                      onClick={() => setSelectedId(q.id)}
                      className={`w-full flex items-center gap-2 px-2 py-2.5 rounded-lg text-left group transition-all ${
                        selectedId === q.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <span className="text-slate-300 group-hover:text-slate-400 transition-colors cursor-grab active:cursor-grabbing shrink-0">
                        <GripVertical className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs text-slate-400 font-medium w-4 shrink-0">{idx + 1}</span>
                      <span className={`shrink-0 ${selectedId === q.id ? 'text-blue-500' : 'text-slate-400'}`}>
                        {getTypeIcon(q.type)}
                      </span>
                      <span className={`text-xs truncate flex-1 ${
                        selectedId === q.id ? 'text-slate-800 font-medium' : 'text-slate-600'
                      }`}>
                        {q.title || <span className="italic text-slate-400">Untitled</span>}
                      </span>
                      {q.required && (
                        <span className="text-red-400 text-xs shrink-0">*</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center canvas */}
        <div className="flex-1 overflow-y-auto flex items-start justify-center p-8 bg-slate-50">
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-20 h-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center mb-5 shadow-sm">
                <Plus className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-2">Start building your survey</h3>
              <p className="text-sm text-slate-400 mb-6 max-w-xs">Add questions, screens, and other content to create your survey.</p>
              <button
                onClick={() => setShowAddContent(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add content
              </button>
            </div>
          ) : selectedQ ? (
            <QuestionCanvas
              question={selectedQ}
              index={questions.findIndex((q) => q.id === selectedQ.id)}
              total={questions.length}
              onChange={(fields) => handleQuestionFieldChange(selectedQ.id, fields)}
              onDelete={() => handleDeleteQuestion(selectedQ.id)}
              onMoveUp={() => handleMoveQuestion(selectedQ.id, 'up')}
              onMoveDown={() => handleMoveQuestion(selectedQ.id, 'down')}
            />
          ) : null}
        </div>

        {/* Right settings panel */}
        {selectedQ ? (
          <div className="w-64 shrink-0 bg-white border-l border-slate-100 overflow-y-auto">
            <SettingsPanel
              question={selectedQ}
              onChange={(fields) => handleQuestionFieldChange(selectedQ.id, fields)}
              typeDropRef={typeDropRef}
              showTypeDropdown={showTypeDropdown}
              setShowTypeDropdown={setShowTypeDropdown}
            />
          </div>
        ) : (
          <div className="w-64 shrink-0 bg-white border-l border-slate-100 flex items-center justify-center">
            <p className="text-xs text-slate-400 px-6 text-center">Select a question to edit its settings</p>
          </div>
        )}
      </div>

      {showAddContent && (
        <AddContentModal
          onSelect={handleAddQuestion}
          onClose={() => setShowAddContent(false)}
        />
      )}

      {showPreview && (
        <SurveyPreviewModal
          questions={questions}
          surveyTitle={survey.title || 'Untitled Survey'}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

// ============================================================
// Question Canvas
// ============================================================

interface QuestionCanvasProps {
  question: SurveyQuestion;
  index: number;
  total: number;
  onChange: (fields: Partial<SurveyQuestion>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function QuestionCanvas({ question, index, total, onChange, onDelete, onMoveUp, onMoveDown }: QuestionCanvasProps) {
  const [newChoice, setNewChoice] = useState('');

  const choices = question.settings?.choices ?? [];

  function addChoice() {
    if (!newChoice.trim()) return;
    onChange({ settings: { ...question.settings, choices: [...choices, newChoice.trim()] } });
    setNewChoice('');
  }

  function updateChoice(i: number, val: string) {
    const updated = choices.map((c, idx) => (idx === i ? val : c));
    onChange({ settings: { ...question.settings, choices: updated } });
  }

  function removeChoice(i: number) {
    const updated = choices.filter((_, idx) => idx !== i);
    onChange({ settings: { ...question.settings, choices: updated } });
  }

  return (
    <div className="w-full max-w-xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <span className="text-xs font-medium text-slate-400">
            {index + 1} / {total}
            {question.required && <span className="text-red-400 ml-1">Required</span>}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onMoveUp}
              disabled={index === 0}
              title="Move up"
              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={onMoveDown}
              disabled={index === total - 1}
              title="Move down"
              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-2">
          <textarea
            value={question.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Type your question here…"
            rows={2}
            className="w-full text-lg font-semibold text-slate-800 bg-transparent border-none outline-none resize-none placeholder:text-slate-300 leading-snug"
          />
          <textarea
            value={question.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Description (optional)"
            rows={1}
            className="w-full text-sm text-slate-500 bg-transparent border-none outline-none resize-none placeholder:text-slate-300 mt-1"
          />
        </div>

        <div className="px-6 pb-7 pt-2">
          <AnswerPreview question={question} choices={choices} newChoice={newChoice}
            onNewChoiceChange={setNewChoice} onAddChoice={addChoice}
            onUpdateChoice={updateChoice} onRemoveChoice={removeChoice} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Answer preview
// ============================================================

function AnswerPreview({
  question,
  choices,
  newChoice,
  onNewChoiceChange,
  onAddChoice,
  onUpdateChoice,
  onRemoveChoice,
}: {
  question: SurveyQuestion;
  choices: string[];
  newChoice: string;
  onNewChoiceChange: (v: string) => void;
  onAddChoice: () => void;
  onUpdateChoice: (i: number, v: string) => void;
  onRemoveChoice: (i: number) => void;
}) {
  const ratingMax = question.settings?.ratingMax ?? 5;

  if (question.type === 'short_text' || question.type === 'email' || question.type === 'number' ||
      question.type === 'phone_number' || question.type === 'website') {
    return (
      <input
        disabled
        placeholder={
          question.type === 'email' ? 'name@example.com' :
          question.type === 'number' ? '0' :
          question.type === 'phone_number' ? '+1 (555) 000-0000' :
          question.type === 'website' ? 'https://' :
          'Type your answer…'
        }
        className="w-full border-b border-slate-200 bg-transparent py-2 text-sm text-slate-400 outline-none placeholder:text-slate-300"
      />
    );
  }

  if (question.type === 'long_text') {
    return (
      <textarea
        disabled
        placeholder="Type your answer…"
        rows={3}
        className="w-full border-b border-slate-200 bg-transparent py-2 text-sm text-slate-400 outline-none resize-none placeholder:text-slate-300"
      />
    );
  }

  if (question.type === 'rating') {
    return (
      <div className="flex items-center gap-1.5 pt-1">
        {Array.from({ length: ratingMax }).map((_, i) => (
          <Star key={i} className="w-6 h-6 text-slate-200" />
        ))}
        <span className="text-xs text-slate-400 ml-2">{ratingMax} stars</span>
      </div>
    );
  }

  if (question.type === 'multiple_choice' || question.type === 'single_choice') {
    return (
      <div className="space-y-2 pt-1">
        {choices.map((choice, i) => (
          <div key={i} className="flex items-center gap-2 group">
            <div className={`w-4 h-4 shrink-0 border border-slate-300 ${question.type === 'multiple_choice' ? 'rounded' : 'rounded-full'} bg-white`} />
            <input
              value={choice}
              onChange={(e) => onUpdateChoice(i, e.target.value)}
              className="flex-1 text-sm text-slate-700 bg-transparent border-none outline-none border-b border-transparent hover:border-slate-200 focus:border-blue-400 py-0.5 transition-colors"
            />
            <button
              onClick={() => onRemoveChoice(i)}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <div className={`w-4 h-4 shrink-0 border-2 border-dashed border-slate-200 ${question.type === 'multiple_choice' ? 'rounded' : 'rounded-full'}`} />
          <input
            value={newChoice}
            onChange={(e) => onNewChoiceChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddChoice(); } }}
            placeholder="Add option…"
            className="flex-1 text-sm text-slate-400 bg-transparent border-none outline-none placeholder:text-slate-300"
          />
          {newChoice.trim() && (
            <button onClick={onAddChoice} className="text-blue-500 text-xs font-medium hover:text-blue-600">
              Add
            </button>
          )}
        </div>
      </div>
    );
  }

  if (question.type === 'yes_no') {
    return (
      <div className="flex gap-3 pt-1">
        {['Yes', 'No'].map((opt) => (
          <div key={opt} className="flex-1 py-2.5 rounded-lg border-2 border-slate-200 text-sm text-slate-400 text-center">
            {opt}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'nps') {
    return (
      <div className="pt-1">
        <div className="flex gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i} className="flex-1 h-9 rounded-lg border-2 border-slate-200 flex items-center justify-center text-xs text-slate-400">
              {i}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-slate-400">Not likely</span>
          <span className="text-xs text-slate-400">Very likely</span>
        </div>
      </div>
    );
  }

  if (question.type === 'opinion_scale') {
    return (
      <div className="flex gap-1 pt-1">
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex-1 h-9 rounded-lg border-2 border-slate-200 flex items-center justify-center text-xs text-slate-400">
            {i + 1}
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'date') {
    return (
      <input
        type="date"
        disabled
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400 outline-none bg-transparent"
      />
    );
  }

  if (question.type === 'dropdown') {
    return (
      <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400">
        <span className="flex-1">Select an option…</span>
        <ChevronDown className="w-4 h-4 shrink-0" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-center">
      <p className="text-sm text-slate-400 italic">
        {getTypeLabel(question.type)} — editing not available for this type
      </p>
    </div>
  );
}

// ============================================================
// Settings Panel
// ============================================================

interface SettingsPanelProps {
  question: SurveyQuestion;
  onChange: (fields: Partial<SurveyQuestion>) => void;
  typeDropRef: React.RefObject<HTMLDivElement>;
  showTypeDropdown: boolean;
  setShowTypeDropdown: (v: boolean) => void;
}

function SettingsPanel({ question, onChange, typeDropRef, showTypeDropdown, setShowTypeDropdown }: SettingsPanelProps) {
  const ratingMax = question.settings?.ratingMax ?? 5;

  return (
    <div className="p-5 space-y-6">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Question Type</p>
        <div className="relative" ref={typeDropRef}>
          <button
            onClick={() => setShowTypeDropdown(!showTypeDropdown)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:border-slate-300 bg-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="text-slate-400">{getTypeIcon(question.type)}</span>
              {getTypeLabel(question.type)}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showTypeDropdown ? 'rotate-180' : ''}`} />
          </button>
          {showTypeDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50">
              {CORE_QUESTION_TYPES.map((qt) => (
                <button
                  key={qt.type}
                  onClick={() => {
                    const newSettings =
                      qt.type === 'multiple_choice' || qt.type === 'single_choice'
                        ? { choices: question.settings?.choices?.length ? question.settings.choices : ['Option A', 'Option B'] }
                        : qt.type === 'rating'
                        ? { ratingMax: question.settings?.ratingMax ?? 5 }
                        : {};
                    onChange({ type: qt.type, settings: newSettings });
                    setShowTypeDropdown(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs transition-colors ${
                    qt.type === question.type ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-slate-400">{qt.icon}</span>
                  {qt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Settings</p>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-700">Required</span>
            <button
              onClick={() => onChange({ required: !question.required })}
              className={`w-9 h-5 rounded-full transition-colors relative ${question.required ? 'bg-blue-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${question.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </label>

          {(question.type === 'rating') && (
            <div>
              <label className="text-sm text-slate-700 block mb-2">Stars</label>
              <div className="flex items-center gap-2">
                {[3, 4, 5, 7, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => onChange({ settings: { ...question.settings, ratingMax: n } })}
                    className={`w-8 h-8 rounded-lg text-xs font-medium border transition-colors ${
                      ratingMax === n
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
