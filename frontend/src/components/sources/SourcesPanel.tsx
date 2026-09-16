'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Globe,
  Sparkles,
  Search,
  FileText,
  UploadCloud,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  FileCode,
  FileType,
  Check,
} from 'lucide-react';
import {
  fetchNotebookSources,
  deleteSourceFile,
  setSourceActive,
  setAllSourcesActive,
  Source,
} from '@/modules/sources/api';
import { UploadModal } from './UploadModal';
import { SourceDetailModal } from './SourceDetailModal';

interface SourcesPanelProps {
  notebookId?: string;
  onSourcesChange?: (count: number) => void;
}

export const SourcesPanel: React.FC<SourcesPanelProps> = ({
  notebookId = 'default_notebook_1',
  onSourcesChange,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  const loadSources = async () => {
    try {
      const data = await fetchNotebookSources(notebookId);
      setSources(data);
      if (onSourcesChange) {
        onSourcesChange(data.length);
      }
    } catch (err) {
      console.error('Error loading sources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSources();
    const interval = setInterval(loadSources, 5000);
    return () => clearInterval(interval);
  }, [notebookId]);

  const handleDelete = async (e: React.MouseEvent, sourceId: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Delete '${title}'?`)) return;

    try {
      await deleteSourceFile(notebookId, sourceId);
      setSources((prev) => prev.filter((s) => s.id !== sourceId));
      if (onSourcesChange) {
        onSourcesChange(sources.length - 1);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete source');
    }
  };

  const handleToggleActive = async (e: React.MouseEvent, source: Source) => {
    e.stopPropagation();
    const nextActive = !source.is_active;
    setSources((prev) =>
      prev.map((s) => (s.id === source.id ? { ...s, is_active: nextActive } : s))
    );
    try {
      await setSourceActive(notebookId, source.id, nextActive);
    } catch (err) {
      console.error('Failed to update source:', err);
      setSources((prev) =>
        prev.map((s) => (s.id === source.id ? { ...s, is_active: source.is_active } : s))
      );
    }
  };

  const allSelected = sources.length > 0 && sources.every((s) => s.is_active);

  const handleSelectAll = async (nextActive: boolean) => {
    setSources((prev) => prev.map((s) => ({ ...s, is_active: nextActive })));
    try {
      await setAllSourcesActive(notebookId, nextActive);
    } catch (err) {
      console.error('Failed to update sources:', err);
      loadSources();
    }
  };

  const filteredSources = sources.filter((s) =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-rose-400" />;
      case 'docx':
        return <FileType className="w-4 h-4 text-sky-400" />;
      case 'markdown':
        return <FileCode className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-indigo-400" />;
    }
  };

  if (collapsed) {
    return (
      <div className="w-12 border-r border-notebook-border bg-notebook-bg flex flex-col items-center py-4 space-y-4 select-none">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
          title="Expand Sources Panel"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <div className="text-xs font-semibold text-notebook-muted tracking-wider uppercase rotate-90 my-6">
          Sources ({sources.length})
        </div>
      </div>
    );
  }

  return (
    <aside className="w-80 border-r border-notebook-border bg-notebook-bg flex flex-col h-full select-none">
      {/* Panel Header */}
      <div className="p-4 flex items-center justify-between border-b border-notebook-border/50">
        <div className="flex items-center space-x-2">
          <h2 className="text-notebook-text font-semibold text-sm">Sources</h2>
          <span className="text-xs text-notebook-muted bg-notebook-card px-2 py-0.5 rounded-full border border-notebook-border">
            {sources.length}
          </span>
        </div>

        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
          title="Collapse Sources Panel"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="p-4 flex-1 flex flex-col space-y-4 overflow-y-auto">
        {/* Add Sources Action Button */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="w-full bg-notebook-card hover:bg-notebook-hover text-notebook-text font-medium text-xs py-2.5 px-4 rounded-xl border border-notebook-border flex items-center justify-center space-x-2 transition-all duration-150 shadow-sm hover:border-indigo-500/50"
        >
          <Plus className="w-4 h-4 text-indigo-400" />
          <span>Add sources</span>
        </button>

        {/* Web Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-2 flex items-center space-x-1 z-10">
            <button className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors" title="Search the web">
              <Globe className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors" title="Fast research">
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Search the web for new sources"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-notebook-card text-notebook-text text-xs pl-[72px] pr-9 py-2.5 rounded-xl border border-notebook-border focus:outline-none focus:border-indigo-500 placeholder:text-notebook-subtle"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-notebook-muted pointer-events-none" />
        </div>

        {/* Select All Row */}
        {sources.length > 0 && (
          <button
            onClick={() => handleSelectAll(!allSelected)}
            className="w-full flex items-center justify-between px-1 text-xs text-notebook-muted hover:text-notebook-text transition-colors"
          >
            <span>Select all</span>
            <span
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                allSelected
                  ? 'bg-indigo-500 border-indigo-500 text-white'
                  : 'border-notebook-subtle'
              }`}
            >
              {allSelected && <Check className="w-3 h-3" />}
            </span>
          </button>
        )}

        {/* Sources List / Empty State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-notebook-muted space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <p className="text-xs">Loading sources...</p>
          </div>
        ) : filteredSources.length > 0 ? (
          <div className="space-y-2">
            {filteredSources.map((source) => (
              <div
                key={source.id}
                onClick={() => setSelectedSourceId(source.id)}
                className="bg-notebook-card hover:bg-notebook-hover border border-notebook-border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all duration-150 group"
              >
                <div className="flex items-center space-x-3 truncate">
                  <div className="w-8 h-8 rounded-lg bg-notebook-bg border border-notebook-border flex items-center justify-center shrink-0">
                    {getFileIcon(source.file_type)}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-notebook-text truncate group-hover:text-white">
                      {source.title}
                    </p>
                    <p className="text-[10px] text-notebook-muted font-mono">
                      {formatSize(source.file_size)} • {source.chunk_count} chunks
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0 ml-2">
                  {/* Status Badge */}
                  {source.status === 'processing' && (
                    <span className="p-1 text-amber-400" title="Processing document...">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    </span>
                  )}
                  {source.status === 'ready' && (
                    <span className="p-1 text-emerald-400" title="Ready">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {source.status === 'failed' && (
                    <span className="p-1 text-rose-400" title={source.error_message || 'Processing failed'}>
                      <XCircle className="w-3.5 h-3.5" />
                    </span>
                  )}

                  <button
                    onClick={(e) => handleDelete(e, source.id, source.title)}
                    className="p-1 text-notebook-muted hover:text-rose-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Source"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleToggleActive(e, source)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      source.is_active
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'border-notebook-subtle'
                    }`}
                    title={source.is_active ? 'Included in chat & studio' : 'Excluded from chat & studio'}
                  >
                    {source.is_active && <Check className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            onClick={() => setIsUploadModalOpen(true)}
            className="flex-1 border-2 border-dashed border-notebook-border/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 bg-notebook-card/20 hover:border-indigo-500/40 transition-colors cursor-pointer group min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-notebook-card border border-notebook-border flex items-center justify-center text-notebook-muted group-hover:text-indigo-400 group-hover:scale-105 transition-all">
              <FileText className="w-6 h-6" />
            </div>

            <div className="space-y-1 max-w-[200px]">
              <h3 className="text-xs font-medium text-notebook-text">
                Saved sources will appear here
              </h3>
              <p className="text-[11px] text-notebook-muted leading-relaxed">
                Add PDF, TXT, DOCX, or MD files to build your knowledge base.
              </p>
            </div>

            <div className="pt-2 text-[11px] text-notebook-subtle flex items-center space-x-1">
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Drop files here or <span className="text-indigo-400 underline">add a source</span></span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        notebookId={notebookId}
        onUploadSuccess={() => loadSources()}
      />

      {/* Source Detail Modal */}
      <SourceDetailModal
        sourceId={selectedSourceId}
        notebookId={notebookId}
        onClose={() => setSelectedSourceId(null)}
        onSourceDeleted={() => loadSources()}
      />
    </aside>
  );
};
