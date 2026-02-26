import { useState } from 'react';
import { X, PlayCircle } from 'lucide-react';

interface DemoVideoBannerProps {
  sessionId: string;
  canDismiss: boolean;
  onDismiss: () => void;
}

export default function DemoVideoBanner({ canDismiss, onDismiss }: DemoVideoBannerProps) {
  const [dismissing, setDismissing] = useState(false);

  async function handleDismiss() {
    setDismissing(true);
    onDismiss();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-start justify-between px-6 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <PlayCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">How to Conduct a Usability Test</h3>
            <p className="text-xs text-slate-500 mt-0.5">Watch this short guide to get the most out of your session checklist.</p>
          </div>
        </div>
        {canDismiss && (
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="flex-shrink-0 ml-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            aria-label="Dismiss video"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="px-6 pb-5">
        <div className="relative w-full rounded-lg overflow-hidden bg-slate-900" style={{ paddingBottom: '45%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/1UCDUOB_aS8"
            title="How to Conduct a Usability Test"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
