'use client';

import React, { useEffect, useState } from 'react';
import { X, FileText, Loader2, Layers, AlertCircle, Trash2 } from 'lucide-react';
import {
  fetchSourceDetail,
  SourceDetailResponse,
  deleteSourceFile,
} from '@/modules/sources/api';

interface SourceDetailModalProps {
  sourceId: string | null;
  notebookId: string;
  onClose: () => void;
  onSourceDeleted: (deletedId: string) => void;
}

export const SourceDetailModal: React.FC<SourceDetailModalProps> = ({
  sourceId,
  notebookId,
  onClose,
  onSourceDeleted,
}) => {
  const [data, setData] = useState<SourceDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!sourceId) return;
    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchSourceDetail(sourceId!);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load source details.');
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [sourceId]);

  if (!sourceId) return null;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete '${data?.source.title || 'this source'}'?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteSourceFile(notebookId, sourceId);
      onSourceDeleted(sourceId);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete source document');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end animate-fadeIn select-none">
      <div className="bg-notebook-card border-l border-notebook-border w-full max-w-xl h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-notebook-border flex items-center justify-between">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-8 h-8 rounded-lg bg-[#a8c7fa]/15 text-[#a8c7fa] flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="text-notebook-text font-semibold text-sm truncate">
                {data?.source.title || 'Source Preview'}
              </h2>
              <p className="text-[11px] text-notebook-muted font-mono uppercase">
                {data?.source.file_type} • {data ? formatSize(data.source.file_size) : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Delete source"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 text-notebook-muted hover:text-notebook-text rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-notebook-muted space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#a8c7fa]" />
              <p className="text-xs">Loading document chunks...</p>
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-center space-x-2 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3 bg-notebook-bg/50 p-3 rounded-xl border border-notebook-border text-center">
                <div>
                  <p className="text-[10px] text-notebook-muted uppercase">Status</p>
                  <p className="text-xs font-semibold text-emerald-400 capitalize">
                    {data?.source.status}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-notebook-muted uppercase">Total Chunks</p>
                  <p className="text-xs font-semibold text-notebook-text">
                    {data?.source.chunk_count}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-notebook-muted uppercase">Total Characters</p>
                  <p className="text-xs font-semibold text-notebook-text">
                    {data?.source.char_count}
                  </p>
                </div>
              </div>

              {/* Chunks Listing */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2 text-xs font-medium text-notebook-text">
                  <Layers className="w-4 h-4 text-[#a8c7fa]" />
                  <span>Extracted Document Chunks ({data?.chunks.length || 0})</span>
                </div>

                {data?.chunks.map((chunk) => (
                  <div
                    key={chunk.id}
                    className="bg-notebook-bg rounded-xl p-4 border border-notebook-border space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-notebook-muted border-b border-notebook-border/40 pb-2">
                      <span className="text-[#a8c7fa]">Chunk #{chunk.chunk_index + 1}</span>
                      <span>Page {chunk.page_number ?? 1} • {chunk.char_count} chars</span>
                    </div>
                    <p className="text-notebook-text leading-relaxed font-sans whitespace-pre-wrap">
                      {chunk.text}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
