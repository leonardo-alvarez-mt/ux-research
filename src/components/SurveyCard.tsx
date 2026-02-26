import { BarChart2, ClipboardList, Globe, Lock, MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import type { Survey } from '../lib/types';

interface SurveyCardProps {
  survey: Survey;
  responseCount: number;
  onEdit: (id: string) => void;
  onResults: (id: string) => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SurveyCard({ survey, responseCount, onEdit, onResults, onDelete }: SurveyCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <ClipboardList className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-400">Survey</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              survey.status === 'published'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
            }`}>
              {survey.status === 'published'
                ? <><Globe className="w-2.5 h-2.5" /> Published</>
                : <><Lock className="w-2.5 h-2.5" /> Draft</>
              }
            </span>
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-30">
                  <button
                    onClick={() => { setMenuOpen(false); onEdit(survey.id); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-slate-400" /> Edit Survey
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onResults(survey.id); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <BarChart2 className="w-3.5 h-3.5 text-slate-400" /> View Results
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => { setMenuOpen(false); onDelete(survey.id); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          className="text-left w-full"
          onClick={() => onEdit(survey.id)}
        >
          <h3 className="text-sm font-semibold text-slate-900 leading-snug mb-1 hover:text-blue-600 transition-colors">
            {survey.title || 'Untitled Survey'}
          </h3>
          {survey.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mb-3">{survey.description}</p>
          )}
        </button>

        <div className="flex items-center gap-4 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{responseCount}</span>
            <span className="text-xs text-slate-400">response{responseCount !== 1 ? 's' : ''}</span>
          </div>
          <span className="text-xs text-slate-400 ml-auto">{formatDate(survey.created_at)}</span>
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-2">
        <button
          onClick={() => onEdit(survey.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 text-xs font-medium transition-colors border border-slate-200"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={() => onResults(survey.id)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium transition-colors border border-blue-200"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Results
        </button>
      </div>
    </div>
  );
}
