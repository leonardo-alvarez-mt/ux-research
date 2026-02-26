import { useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Link2,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  Plus,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import {
  fetchTaskAttachments,
  addLinkAttachment,
  deleteAttachment,
  uploadTaskFile,
  addFileAttachment,
} from '../lib/data';
import type { TaskAttachment } from '../lib/types';

interface TaskAttachmentsProps {
  taskId: string;
  sessionId: string;
  readOnly?: boolean;
}

type AddMode = null | 'link' | 'file';

export default function TaskAttachments({ taskId, sessionId, readOnly = false }: TaskAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTaskAttachments(taskId)
      .then(setAttachments)
      .finally(() => setLoading(false));
  }, [taskId]);

  function reset() {
    setAddMode(null);
    setLinkLabel('');
    setLinkUrl('');
    setError('');
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    setSaving(true);
    setError('');
    try {
      const label = linkLabel.trim() || linkUrl.trim();
      const att = await addLinkAttachment(taskId, label, linkUrl.trim());
      setAttachments((prev) => [...prev, att]);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add link.');
    } finally {
      setSaving(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadTaskFile(sessionId, taskId, file);
      const att = await addFileAttachment(taskId, file.name, url, file.name);
      setAttachments((prev) => [...prev, att]);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteAttachment(id);
    } catch {
      fetchTaskAttachments(taskId).then(setAttachments);
    } finally {
      setRemovingId(null);
    }
  }

  if (loading) return null;

  return (
    <div className="mt-2 space-y-1.5">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="group/att flex items-center gap-2 text-xs"
        >
          {att.type === 'file' ? (
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          ) : (
            <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <a
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-xs flex items-center gap-1"
          >
            {att.label || att.url}
            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
          </a>
          {!readOnly && (
            <button
              onClick={() => handleRemove(att.id)}
              disabled={removingId === att.id}
              className="opacity-0 group-hover/att:opacity-100 p-0.5 text-slate-300 hover:text-red-500 transition-all rounded"
            >
              {removingId === att.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <X className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      ))}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </div>
      )}

      {addMode === 'link' && (
        <form onSubmit={handleAddLink} className="flex items-center gap-1.5 mt-1.5">
          <input
            type="text"
            value={linkLabel}
            onChange={(e) => setLinkLabel(e.target.value)}
            placeholder="Label (optional)"
            className="w-28 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://..."
            required
            className="flex-1 min-w-0 px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <button
            type="submit"
            disabled={saving || !linkUrl.trim()}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-semibold rounded transition-colors"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
          </button>
          <button
            type="button"
            onClick={reset}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </form>
      )}

      {!readOnly && addMode === null && !uploading && (
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => setAddMode('link')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <Link2 className="w-3 h-3" />
            Add link
          </button>
          <span className="text-slate-200">|</span>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <Upload className="w-3 h-3" />
            Upload file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Uploading...
        </div>
      )}

      {attachments.length === 0 && addMode === null && !uploading && (
        <div className="flex items-center gap-1 text-xs text-slate-300 mt-0.5">
          <Paperclip className="w-3 h-3" />
          No attachments
        </div>
      )}
    </div>
  );
}
