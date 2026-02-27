import { useEffect, useRef, useState } from 'react';
import { Plus, ChevronDown, MousePointerClick, MessageSquare, Users, Zap, ClipboardList } from 'lucide-react';
import type { SessionType } from '../lib/types';

interface SessionTypeOption {
  type: SessionType;
  label: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

const SESSION_OPTIONS: SessionTypeOption[] = [
  {
    type: 'usability_test',
    label: 'Usability Testing',
    description: 'Structured test with 40+ auto-generated tasks',
    icon: <MousePointerClick className="w-4 h-4" />,
    available: true,
  },
  {
    type: 'survey',
    label: 'Survey',
    description: 'Collect feedback with a custom Typeform-style survey',
    icon: <ClipboardList className="w-4 h-4" />,
    available: true,
  },
  {
    type: 'user_interview',
    label: 'User Interview',
    description: 'In-depth one-on-one research conversation',
    icon: <MessageSquare className="w-4 h-4" />,
    available: false,
  },
  {
    type: 'client_working_group',
    label: 'Client Working Group',
    description: 'Collaborative session with client stakeholders',
    icon: <Users className="w-4 h-4" />,
    available: true,
  },
  {
    type: 'guerrilla_testing',
    label: 'Guerrilla Testing',
    description: 'Quick informal tests in the field',
    icon: <Zap className="w-4 h-4" />,
    available: false,
  },
];

interface NewSessionMenuProps {
  onSelect: (type: SessionType) => void;
}

export default function NewSessionMenu({ onSelect }: NewSessionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleSelect(option: SessionTypeOption) {
    setOpen(false);
    onSelect(option.type);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm shadow-sm select-none"
      >
        <Plus className="w-4 h-4" />
        New Session
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Session Type</p>
          </div>
          <div className="py-1.5">
            {SESSION_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={() => handleSelect(option)}
                disabled={!option.available}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors group ${
                  option.available
                    ? 'hover:bg-slate-50 cursor-pointer'
                    : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  !option.available
                    ? 'bg-slate-100 text-slate-400'
                    : option.type === 'client_working_group'
                    ? 'bg-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white'
                    : 'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                }`}>
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-800">{option.label}</span>
                    {!option.available && (
                      <span className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-medium">
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
