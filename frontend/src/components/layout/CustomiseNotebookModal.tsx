'use client';

import React, { useRef, useState } from 'react';
import { X, Upload, Trash2, FileText, Loader2 } from 'lucide-react';
import { Notebook, customizeNotebook } from '@/modules/notebooks/api';

interface CustomiseNotebookModalProps {
  notebook: Notebook;
  onClose: () => void;
  onSaved: (notebook: Notebook) => void;
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const CustomiseNotebookModal: React.FC<CustomiseNotebookModalProps> = ({
  notebook,
  onClose,
  onSaved,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(notebook.title);
  const [coverImage, setCoverImage] = useState<string | null | undefined>(notebook.cover_image);
  const [coverChanged, setCoverChanged] = useState(false);
  const [useCustomSummary, setUseCustomSummary] = useState(notebook.use_custom_summary);
  const [customSummaryText, setCustomSummaryText] = useState(notebook.custom_summary_text || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image must be under 2MB.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setCoverImage(reader.result as string);
      setCoverChanged(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => {
    setCoverImage(null);
    setCoverChanged(true);
  };

  const handleDone = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await customizeNotebook(notebook.id, {
        title,
        ...(coverChanged ? { cover_image: coverImage || '' } : {}),
        use_custom_summary: useCustomSummary,
        custom_summary_text: customSummaryText,
      });
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-notebook-card border border-notebook-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-4 border-b border-notebook-border flex items-start justify-between">
          <h2 className="text-sm font-semibold text-notebook-text pr-4">
            Customise the experience of &lsquo;{notebook.title}&rsquo;
          </h2>
          <button onClick={onClose} className="p-1 text-notebook-muted hover:text-notebook-text rounded-lg transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Cover image */}
          <div className="relative w-full h-36 rounded-xl overflow-hidden border border-notebook-border bg-notebook-bg flex items-center justify-center">
            {coverImage ? (
              <img src={coverImage} alt="Notebook cover" className="w-full h-full object-cover" />
            ) : (
              <FileText className="w-8 h-8 text-notebook-subtle" />
            )}
            {coverImage && (
              <button
                onClick={handleRemoveCover}
                className="absolute top-2 left-2 p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors"
                title="Remove cover image"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 hover:bg-black/80 text-white text-[11px] px-2 py-1 rounded-lg transition-colors"
            >
              <Upload className="w-3 h-3" />
              <span>Upload</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0])}
            />
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-notebook-muted font-medium">Notebook title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-notebook-bg text-notebook-text text-sm px-3 py-2 rounded-lg border border-notebook-border focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Custom summary toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-notebook-text">Set custom notebook summary</span>
              <button
                onClick={() => setUseCustomSummary((v) => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                  useCustomSummary ? 'bg-indigo-500' : 'bg-notebook-border'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    useCustomSummary ? 'left-4.5 translate-x-0.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-notebook-muted leading-relaxed">
              By default, Recall AI autogenerates a summary that refreshes whenever your sources
              change. Turn this on to write your own summary instead.
            </p>
            {useCustomSummary && (
              <textarea
                value={customSummaryText}
                onChange={(e) => setCustomSummaryText(e.target.value)}
                placeholder="Write a custom summary for this notebook..."
                className="w-full bg-notebook-bg text-notebook-text text-xs px-3 py-2 rounded-lg border border-notebook-border focus:outline-none focus:border-indigo-500 min-h-[100px] resize-none"
              />
            )}
          </div>

          {error && <p className="text-[11px] text-rose-400">{error}</p>}
        </div>

        <div className="p-4 border-t border-notebook-border flex justify-end">
          <button
            onClick={handleDone}
            disabled={saving}
            className="bg-notebook-text hover:bg-white text-notebook-bg text-xs font-semibold px-4 py-2 rounded-full transition-colors disabled:opacity-60 flex items-center space-x-1.5"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};
