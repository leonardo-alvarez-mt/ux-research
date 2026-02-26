import { useEffect, useState } from 'react';
import { ArrowRight, Check, Loader2, Star, AlertCircle } from 'lucide-react';
import { fetchSurveyByShareToken, fetchSurveyQuestions, submitSurveyResponse } from '../lib/data';
import type { Survey, SurveyQuestion } from '../lib/types';

interface SurveyResponsePageProps {
  token: string;
  onDone?: () => void;
}

type AnswerValue = string | string[] | number;
type AnswersMap = Record<string, AnswerValue>;

function validateAnswer(question: SurveyQuestion, value: AnswerValue | undefined): string | null {
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

export default function SurveyResponsePage({ token }: SurveyResponsePageProps) {
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState<'welcome' | number | 'done'>('welcome');
  const [answers, setAnswers] = useState<AnswersMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [attemptedNext, setAttemptedNext] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const s = await fetchSurveyByShareToken(token);
        if (!s) { setNotFound(true); return; }
        const qs = await fetchSurveyQuestions(s.id);
        setSurvey(s);
        setQuestions(qs);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔍</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Survey not found</h1>
          <p className="text-slate-500 text-sm">This survey link may be invalid or has been unpublished.</p>
        </div>
      </div>
    );
  }

  const currentIndex = typeof step === 'number' ? step : -1;
  const currentQ = typeof step === 'number' ? questions[step] : null;
  const progress = typeof step === 'number' ? ((step) / questions.length) * 100 : step === 'done' ? 100 : 0;

  function getCurrentAnswer(): AnswerValue {
    if (!currentQ) return '';
    return answers[currentQ.id] ?? '';
  }

  function setCurrentAnswer(val: AnswerValue) {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
  }

  function markTouched(id: string) {
    setTouched((prev) => ({ ...prev, [id]: true }));
  }

  async function handleNext() {
    if (!currentQ) return;
    const err = validateAnswer(currentQ, getCurrentAnswer());
    if (err) {
      setAttemptedNext(true);
      setTouched((prev) => ({ ...prev, [currentQ.id]: true }));
      return;
    }
    setAttemptedNext(false);
    if (typeof step === 'number') {
      if (step < questions.length - 1) {
        setStep(step + 1);
      } else {
        await handleSubmit();
      }
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const answerPayload = questions.map((q) => ({
        question_id: q.id,
        answer: { value: answers[q.id] ?? '' },
      }));
      await submitSurveyResponse(survey!.id, answerPayload);
      setStep('done');
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isLastQuestion = typeof step === 'number' && step === questions.length - 1;
  const currentValidationError = currentQ ? validateAnswer(currentQ, getCurrentAnswer()) : null;
  const showValidationError = currentQ && (touched[currentQ.id] || attemptedNext) && currentValidationError;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {step !== 'welcome' && step !== 'done' && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-slate-100 z-50">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {step === 'welcome' && (
          <WelcomeScreen
            survey={survey}
            questionCount={questions.length}
            onStart={() => {
              if (questions.length === 0) {
                setStep('done');
              } else {
                setStep(0);
              }
            }}
          />
        )}

        {typeof step === 'number' && currentQ && (
          <QuestionStep
            question={currentQ}
            index={currentIndex}
            total={questions.length}
            answer={getCurrentAnswer()}
            onAnswer={setCurrentAnswer}
            onBlur={() => markTouched(currentQ.id)}
            onNext={handleNext}
            isLast={isLastQuestion}
            submitting={submitting}
            submitError={submitError}
            validationError={showValidationError ? currentValidationError : null}
          />
        )}

        {step === 'done' && <ThankYouScreen />}
      </div>
    </div>
  );
}

function WelcomeScreen({
  survey,
  questionCount,
  onStart,
}: {
  survey: Survey;
  questionCount: number;
  onStart: () => void;
}) {
  return (
    <div className="max-w-lg w-full text-center animate-fade-in">
      <h1 className="text-4xl font-bold text-slate-900 mb-4 leading-tight">{survey.title}</h1>
      {survey.description && (
        <p className="text-slate-500 text-lg mb-8 leading-relaxed">{survey.description}</p>
      )}
      {!survey.description && <div className="mb-8" />}
      <p className="text-xs text-slate-400 mb-8">
        {questionCount} question{questionCount !== 1 ? 's' : ''}
      </p>
      <button
        onClick={onStart}
        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-sm hover:shadow-md text-base"
      >
        Start
        <ArrowRight className="w-4 h-4" />
      </button>
      <p className="text-xs text-slate-400 mt-6">Your answers are anonymous</p>
    </div>
  );
}

function QuestionStep({
  question,
  index,
  total,
  answer,
  onAnswer,
  onBlur,
  onNext,
  isLast,
  submitting,
  submitError,
  validationError,
}: {
  question: SurveyQuestion;
  index: number;
  total: number;
  answer: AnswerValue;
  onAnswer: (v: AnswerValue) => void;
  onBlur: () => void;
  onNext: () => void;
  isLast: boolean;
  submitting: boolean;
  submitError: string | null;
  validationError: string | null;
}) {
  return (
    <div className="max-w-lg w-full">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-blue-500 bg-blue-50 px-2.5 py-1 rounded-full">
          {index + 1} / {total}
        </span>
        {question.required && <span className="text-xs text-red-400 font-medium">Required</span>}
      </div>

      <h2 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">
        {question.title || <span className="text-slate-300">Untitled question</span>}
      </h2>

      {question.description && (
        <p className="text-slate-500 text-sm mb-6">{question.description}</p>
      )}
      {!question.description && <div className="mb-6" />}

      <div className="mb-2">
        <AnswerInput
          question={question}
          value={answer}
          onChange={onAnswer}
          onBlur={onBlur}
          showError={!!validationError}
        />
      </div>

      {validationError && (
        <div className="flex items-center gap-1.5 mb-5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <p className="text-xs text-red-500">{validationError}</p>
        </div>
      )}
      {!validationError && <div className="mb-5" />}

      {submitError && <p className="text-red-500 text-sm mb-4">{submitError}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={onNext}
          disabled={submitting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-all text-sm shadow-sm"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isLast ? (
            <><Check className="w-4 h-4" /> Submit</>
          ) : (
            <>Next <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
        {!question.required && (
          <button
            onClick={onNext}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip
          </button>
        )}
      </div>
    </div>
  );
}

function AnswerInput({
  question,
  value,
  onChange,
  onBlur,
  showError,
}: {
  question: SurveyQuestion;
  value: AnswerValue;
  onChange: (v: AnswerValue) => void;
  onBlur: () => void;
  showError: boolean;
}) {
  const choices = question.settings?.choices ?? [];
  const ratingMax = question.settings?.ratingMax ?? 5;
  const [hovered, setHovered] = useState<number | null>(null);

  const textBorderColor = showError
    ? 'border-red-400'
    : 'border-slate-200 focus:border-blue-500';

  if (question.type === 'short_text' || question.type === 'email' || question.type === 'number' ||
      question.type === 'phone_number' || question.type === 'website') {
    return (
      <input
        type={question.type === 'email' ? 'email' : question.type === 'number' ? 'number' : 'text'}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={
          question.type === 'email' ? 'name@example.com' :
          question.type === 'number' ? '0' :
          question.type === 'phone_number' ? '+1 (555) 000-0000' :
          question.type === 'website' ? 'https://example.com' :
          'Your answer…'
        }
        autoFocus
        className={`w-full border-b-2 bg-transparent py-2 text-lg text-slate-800 outline-none placeholder:text-slate-300 transition-colors ${textBorderColor}`}
      />
    );
  }

  if (question.type === 'long_text') {
    return (
      <textarea
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Your answer…"
        rows={4}
        autoFocus
        className={`w-full border-2 bg-transparent py-3 px-4 rounded-xl text-slate-800 outline-none placeholder:text-slate-300 transition-colors resize-none text-base ${
          showError ? 'border-red-400' : 'border-slate-200 focus:border-blue-500'
        }`}
      />
    );
  }

  if (question.type === 'rating') {
    const numVal = typeof value === 'number' ? value : 0;
    const displayVal = hovered !== null ? hovered : numVal;
    return (
      <div className="flex items-center gap-2">
        {Array.from({ length: ratingMax }).map((_, i) => {
          const starNum = i + 1;
          return (
            <button
              key={i}
              onMouseEnter={() => setHovered(starNum)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onChange(starNum)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  starNum <= displayVal ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                }`}
              />
            </button>
          );
        })}
        {numVal > 0 && (
          <span className="text-sm text-slate-500 ml-2">{numVal} / {ratingMax}</span>
        )}
      </div>
    );
  }

  if (question.type === 'single_choice') {
    const strVal = String(value);
    return (
      <div className="space-y-2.5">
        {choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => onChange(choice)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
              strVal === choice
                ? 'border-blue-500 bg-blue-50 text-blue-800'
                : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 transition-all ${
              strVal === choice ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
            }`}>
              {strVal === choice && (
                <div className="w-1.5 h-1.5 rounded-full bg-white mx-auto mt-0.5" />
              )}
            </div>
            <span className="text-sm font-medium">{choice}</span>
          </button>
        ))}
      </div>
    );
  }

  if (question.type === 'multiple_choice') {
    const arrVal = Array.isArray(value) ? value : [];
    function toggle(choice: string) {
      if (arrVal.includes(choice)) {
        onChange(arrVal.filter((v) => v !== choice));
      } else {
        onChange([...arrVal, choice]);
      }
    }
    return (
      <div className="space-y-2.5">
        {choices.map((choice, i) => {
          const checked = arrVal.includes(choice);
          return (
            <button
              key={i}
              onClick={() => toggle(choice)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                checked
                  ? 'border-blue-500 bg-blue-50 text-blue-800'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700'
              }`}
            >
              <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                checked ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
              }`}>
                {checked && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="text-sm font-medium">{choice}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}

function ThankYouScreen() {
  return (
    <div className="max-w-md w-full text-center animate-fade-in">
      <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Check className="w-8 h-8 text-emerald-600" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 mb-3">Thank you!</h1>
      <p className="text-slate-500 text-base leading-relaxed">
        Your response has been submitted successfully.
      </p>
    </div>
  );
}
