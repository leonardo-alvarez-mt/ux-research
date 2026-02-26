import { useState } from 'react';
import {
  X,
  Monitor,
  Smartphone,
  RotateCcw,
  Star,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { SurveyQuestion } from '../lib/types';

interface SurveyPreviewModalProps {
  questions: SurveyQuestion[];
  surveyTitle: string;
  onClose: () => void;
}

function validateAnswer(question: SurveyQuestion, value: string | string[] | number | undefined): string | null {
  const str = typeof value === 'string' ? value.trim() : '';

  if (question.type === 'email') {
    if (!str) return question.required ? 'This field is required' : null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'Please enter a valid email address';
    return null;
  }

  if (question.type === 'number') {
    if (!str && str !== '0') return question.required ? 'This field is required' : null;
    if (isNaN(Number(str))) return 'Please enter a valid number';
    return null;
  }

  if (question.type === 'phone_number') {
    if (!str) return question.required ? 'This field is required' : null;
    if (str.replace(/\D/g, '').length < 7) return 'Please enter a valid phone number';
    return null;
  }

  if (question.type === 'website') {
    if (!str) return question.required ? 'This field is required' : null;
    if (!/^https?:\/\/.+/.test(str)) return 'Please enter a valid URL (starting with http:// or https://)';
    return null;
  }

  if (question.required) {
    if (Array.isArray(value) && value.length === 0) return 'Please select at least one option';
    if (typeof value === 'string' && !value.trim()) return 'This field is required';
    if (value === undefined || value === '') return 'This field is required';
  }

  return null;
}

export default function SurveyPreviewModal({ questions, surveyTitle, onClose }: SurveyPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const visibleQuestions = questions.filter((q) =>
    q.type !== 'welcome_screen' && q.type !== 'end_screen'
  );

  const current = visibleQuestions[currentIndex] ?? null;
  const progress = visibleQuestions.length > 0 ? ((currentIndex) / visibleQuestions.length) * 100 : 0;

  const currentError = current ? validateAnswer(current, answers[current.id]) : null;

  function handleNext() {
    if (!current) return;
    const err = validateAnswer(current, answers[current.id]);
    if (err) {
      setAttemptedNext(true);
      setShakeKey((k) => k + 1);
      setTouched((prev) => ({ ...prev, [current.id]: true }));
      return;
    }
    setAttemptedNext(false);
    if (currentIndex < visibleQuestions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setAttemptedNext(false);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setAnswers({});
    setTouched({});
    setAttemptedNext(false);
  }

  function setAnswer(id: string, value: string | string[] | number) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function markTouched(id: string) {
    setTouched((prev) => ({ ...prev, [id]: true }));
  }

  const showError = current && (touched[current.id] || attemptedNext) && currentError;

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
      {/* Progress bar — very top of page */}
      <div className="h-1.5 bg-slate-200 shrink-0">
        <div
          className="h-full bg-blue-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-center py-3 shrink-0">
        <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 px-1 py-1">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <button
            onClick={() => setViewMode('desktop')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              viewMode === 'desktop' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
              viewMode === 'mobile' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-slate-200 mx-0.5" />
          <button
            onClick={handleRestart}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center overflow-hidden px-4 pb-4">
        {visibleQuestions.length === 0 ? (
          <div className="text-center text-slate-400">
            <p className="text-sm">No questions to preview yet.</p>
          </div>
        ) : (
          <div
            className={`relative bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
              viewMode === 'mobile' ? 'w-80 h-[600px]' : 'w-full max-w-2xl h-[520px]'
            }`}
          >
            {current && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-10 py-10">
                  <p className="text-xs font-medium text-slate-400 tracking-wide uppercase mb-5">
                    Question {currentIndex + 1} of {visibleQuestions.length}
                  </p>
                  <div className="mb-6">
                    <h2 className={`font-semibold text-slate-900 leading-snug ${viewMode === 'mobile' ? 'text-base' : 'text-lg'}`}>
                      {current.title || <span className="italic text-slate-400">Untitled question</span>}
                      {current.required && <span className="text-red-400 ml-1">*</span>}
                    </h2>
                    {current.description && (
                      <p className="text-sm text-slate-500 mt-2">{current.description}</p>
                    )}
                  </div>

                  <PreviewAnswerInput
                    key={`${current.id}-${shakeKey}`}
                    question={current}
                    value={answers[current.id]}
                    onChange={(v) => setAnswer(current.id, v)}
                    onBlur={() => markTouched(current.id)}
                    compact={viewMode === 'mobile'}
                    showError={!!showError}
                  />

                  {showError && (
                    <div className="flex items-center gap-1.5 mt-3">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <p className="text-xs text-red-500">{currentError}</p>
                    </div>
                  )}
                </div>

                <div className={`shrink-0 border-t border-slate-100 py-4 flex items-center justify-end gap-2 ${viewMode === 'mobile' ? 'px-6' : 'px-10'}`}>
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentIndex === visibleQuestions.length - 1
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {currentIndex === visibleQuestions.length - 1 ? (
                      <><Check className="w-3.5 h-3.5" /> Submit</>
                    ) : (
                      'Next'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center pb-4 shrink-0">
        <p className="text-xs text-slate-400">{surveyTitle} — Preview mode</p>
      </div>
    </div>
  );
}

function PreviewAnswerInput({
  question,
  value,
  onChange,
  onBlur,
  compact,
  showError,
}: {
  question: SurveyQuestion;
  value: string | string[] | number | undefined;
  onChange: (v: string | string[] | number) => void;
  onBlur: () => void;
  compact: boolean;
  showError: boolean;
}) {
  const choices = question.settings?.choices ?? [];
  const ratingMax = question.settings?.ratingMax ?? 5;
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const shakeClass = showError ? 'animate-shake' : '';
  const textBorderColor = showError ? 'border-red-400' : 'border-slate-200 focus-within:border-blue-400';

  if (question.type === 'short_text' || question.type === 'email' || question.type === 'number' ||
      question.type === 'phone_number' || question.type === 'website') {
    return (
      <div className={`border-b-2 transition-colors ${textBorderColor} ${shakeClass}`}>
        <input
          type={question.type === 'email' ? 'email' : question.type === 'number' ? 'number' : 'text'}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={
            showError ? 'This field cannot be blank' :
            question.type === 'email' ? 'name@example.com' :
            question.type === 'phone_number' ? '+1 (555) 000-0000' :
            question.type === 'website' ? 'https://example.com' :
            'Type your answer here...'
          }
          className={`w-full py-2.5 text-sm bg-transparent outline-none ${
            showError ? 'placeholder:text-red-300 text-red-600' : 'text-slate-700 placeholder:text-slate-300'
          }`}
        />
      </div>
    );
  }

  if (question.type === 'long_text') {
    return (
      <div className={`border-b-2 transition-colors ${textBorderColor} ${shakeClass}`}>
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={showError ? 'This field cannot be blank' : 'Type your answer here...'}
          rows={compact ? 3 : 4}
          className={`w-full py-2.5 text-sm bg-transparent outline-none resize-none ${
            showError ? 'placeholder:text-red-300 text-red-600' : 'text-slate-700 placeholder:text-slate-300'
          }`}
        />
      </div>
    );
  }

  if (question.type === 'rating') {
    const currentRating = (value as number) ?? 0;
    return (
      <div className={`flex items-center gap-2 pt-1 ${shakeClass}`}>
        {Array.from({ length: ratingMax }).map((_, i) => (
          <button
            key={i}
            onMouseEnter={() => setHoveredStar(i + 1)}
            onMouseLeave={() => setHoveredStar(null)}
            onClick={() => onChange(i + 1)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                i < (hoveredStar ?? currentRating)
                  ? 'text-amber-400 fill-amber-400'
                  : showError ? 'text-red-200' : 'text-slate-200'
              }`}
            />
          </button>
        ))}
      </div>
    );
  }

  if (question.type === 'multiple_choice') {
    const selected = (value as string[]) ?? [];
    return (
      <div className={`space-y-2 pt-1 ${shakeClass}`}>
        {choices.map((choice, i) => {
          const isSelected = selected.includes(choice);
          return (
            <button
              key={i}
              onClick={() => {
                const next = isSelected
                  ? selected.filter((s) => s !== choice)
                  : [...selected, choice];
                onChange(next);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left text-sm transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : showError
                    ? 'border-red-200 bg-red-50/40 text-slate-700 hover:border-red-300'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? 'border-blue-500 bg-blue-500' : showError ? 'border-red-300' : 'border-slate-300'
              }`}>
                {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
              </span>
              {choice}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'single_choice' || question.type === 'dropdown') {
    const selected = (value as string) ?? '';
    return (
      <div className={`space-y-2 pt-1 ${shakeClass}`}>
        {choices.map((choice, i) => {
          const isSelected = selected === choice;
          return (
            <button
              key={i}
              onClick={() => onChange(choice)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left text-sm transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : showError
                    ? 'border-red-200 bg-red-50/40 text-slate-700 hover:border-red-300'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                isSelected ? 'border-blue-500' : showError ? 'border-red-300' : 'border-slate-300'
              }`}>
                {isSelected && <span className="w-2 h-2 rounded-full bg-blue-500" />}
              </span>
              {choice}
            </button>
          );
        })}
      </div>
    );
  }

  if (question.type === 'yes_no') {
    const selected = (value as string) ?? '';
    return (
      <div className={`flex gap-3 pt-1 ${shakeClass}`}>
        {['Yes', 'No'].map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
              selected === opt
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : showError
                  ? 'border-red-200 bg-red-50/40 text-slate-700 hover:border-red-300'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === 'nps') {
    const selected = (value as number) ?? -1;
    return (
      <div className={shakeClass}>
        <div className="flex gap-1 pt-1 flex-wrap">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              onClick={() => onChange(i)}
              className={`w-9 h-9 rounded-lg border-2 text-sm font-medium transition-colors ${
                selected === i
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : showError
                    ? 'border-red-200 bg-red-50/30 text-slate-600 hover:border-red-300'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-400">Not likely</span>
          <span className="text-xs text-slate-400">Very likely</span>
        </div>
      </div>
    );
  }

  if (question.type === 'opinion_scale') {
    const selected = (value as number) ?? -1;
    return (
      <div className={shakeClass}>
        <div className="flex gap-1 pt-1">
          {Array.from({ length: 10 }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => onChange(i + 1)}
              className={`flex-1 h-10 rounded-lg border-2 text-sm font-medium transition-colors ${
                selected === i + 1
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : showError
                    ? 'border-red-200 bg-red-50/30 text-slate-600 hover:border-red-300'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (question.type === 'date') {
    return (
      <input
        type="date"
        value={(value as string) ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className={`border-2 rounded-lg px-4 py-2.5 text-sm text-slate-700 outline-none transition-colors bg-white ${shakeClass} ${
          showError ? 'border-red-400 bg-red-50/40' : 'border-slate-200 focus:border-blue-400'
        }`}
      />
    );
  }

  return (
    <div className="rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
      <p className="text-sm text-slate-400 italic">
        {question.type.replace(/_/g, ' ')} — preview not available
      </p>
    </div>
  );
}
