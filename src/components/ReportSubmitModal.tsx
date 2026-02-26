import { useState, useRef } from 'react';
import { X, Link2, Upload, FileText, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { saveSessionReport, uploadReportFile } from '../lib/data';

interface ReportSubmitModalProps {
  sessionId: string;
  sessionName: string;
  onClose: () => void;
  onSubmitted: (reportUrl: string, reportType: 'link' | 'file') => void;
}

type SubmitMode = 'link' | 'file';

export default function ReportSubmitModal({
  sessionId,
  sessionName,
  onClose,
  onSubmitted,
}: ReportSubmitModalProps) {
  const [mode, setMode] = useState<SubmitMode>('link');
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'link') {
      const trimmed = linkUrl.trim();
      if (!trimmed) {
        setError('Please enter a URL.');
        return;
      }
      try {
        new URL(trimmed);
      } catch {
        setError('Please enter a valid URL (e.g. https://example.com/report).');
        return;
      }
      setSubmitting(true);
      try {
        await saveSessionReport(sessionId, trimmed, 'link');
        onSubmitted(trimmed, 'link');
      } catch {
        setError('Failed to save the report. Please try again.');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!selectedFile) {
        setError('Please select a file to upload.');
        return;
      }
      setSubmitting(true);
      try {
        const url = await uploadReportFile(sessionId, selectedFile);
        await saveSessionReport(sessionId, url, 'file');
        onSubmitted(url, 'file');
      } catch {
        setError('Failed to upload the file. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <h2 className="text-base font-bold text-slate-900">All Tasks Complete!</h2>
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Submit the usability report for <span className="font-medium text-slate-700">{sessionName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">How would you like to submit the report?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setMode('link'); setError(null); }}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-left ${
                    mode === 'link'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    mode === 'link' ? 'bg-blue-100' : 'bg-slate-100'
                  }`}>
                    <Link2 className={`w-5 h-5 ${mode === 'link' ? 'text-blue-600' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${mode === 'link' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Submit as Link
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Paste a URL to the report</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('file'); setError(null); }}
                  className={`flex flex-col items-center gap-2.5 p-4 rounded-xl border-2 transition-all text-left ${
                    mode === 'file'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    mode === 'file' ? 'bg-blue-100' : 'bg-slate-100'
                  }`}>
                    <Upload className={`w-5 h-5 ${mode === 'file' ? 'text-blue-600' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${mode === 'file' ? 'text-blue-700' : 'text-slate-700'}`}>
                      Upload File
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Upload a PDF or document</p>
                  </div>
                </button>
              </div>
            </div>

            {mode === 'link' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Report URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => { setLinkUrl(e.target.value); setError(null); }}
                  placeholder="https://docs.google.com/..."
                  autoFocus
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Report File
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full border-2 border-dashed rounded-xl px-4 py-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                    selectedFile
                      ? 'border-emerald-300 bg-emerald-50'
                      : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  {selectedFile ? (
                    <>
                      <FileText className="w-7 h-7 text-emerald-500" />
                      <p className="text-sm font-semibold text-emerald-700">{selectedFile.name}</p>
                      <p className="text-xs text-emerald-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(1)} MB — click to change
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-7 h-7 text-slate-400" />
                      <p className="text-sm font-semibold text-slate-600">Click to choose a file</p>
                      <p className="text-xs text-slate-400">PDF, DOCX, PPTX, or any document</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-medium text-slate-600 hover:text-slate-800 px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={submitting || (mode === 'link' ? !linkUrl.trim() : !selectedFile)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === 'file' ? 'Uploading...' : 'Saving...'}
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
