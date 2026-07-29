import { X, Clock, MessageSquare, Users, Zap } from 'lucide-react';
import type { SessionType } from '../lib/types';
import { SESSION_TYPE_LABELS } from '../lib/types';

const TYPE_ICONS: Record<SessionType, React.ReactNode> = {
  usability_test: null,
  user_interview: <MessageSquare className="w-6 h-6 text-teal-600" />,
  client_working_group: <Users className="w-6 h-6 text-teal-600" />,
  guerrilla_testing: <Zap className="w-6 h-6 text-teal-600" />,
  survey: <MessageSquare className="w-6 h-6 text-teal-600" />,
  ab_test: <MessageSquare className="w-6 h-6 text-teal-600" />,
};

const TYPE_DESCRIPTIONS: Record<SessionType, string> = {
  usability_test: '',
  user_interview: 'Structured one-on-one conversations to understand user needs, motivations, and behaviors in depth.',
  client_working_group: 'Collaborative workshops with key stakeholders to align on design decisions and gather feedback.',
  guerrilla_testing: 'Quick, informal usability tests conducted in real-world environments with minimal preparation.',
  survey: 'Create and share surveys to collect structured feedback from your audience.',
  ab_test: 'Compare two screenshots and let your team vote on their preference.',
};

interface ComingSoonModalProps {
  sessionType: SessionType;
  onClose: () => void;
}

export default function ComingSoonModal({ sessionType, onClose }: ComingSoonModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-end px-5 py-4">
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 pb-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mb-5">
            {TYPE_ICONS[sessionType]}
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Coming Soon
            </span>
          </div>

          <h2 className="text-slate-900 font-bold text-lg mb-2">
            {SESSION_TYPE_LABELS[sessionType]}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed mb-7">
            {TYPE_DESCRIPTIONS[sessionType]}
            <br className="mb-1" />
            <span className="text-slate-400">This session type is currently in development and will be available soon.</span>
          </p>

          <button
            onClick={onClose}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
