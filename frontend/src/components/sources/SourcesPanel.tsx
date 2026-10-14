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
  ChevronDown,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import {
  fetchNotebookSources,
  deleteSourceFile,
  setSourceActive,
  setAllSourcesActive,
  Source,
} from '@/modules/sources/api';
import { Tooltip } from '@/components/ui/Tooltip';
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
        return <FileCode className="w-4 h-4 text-[#a8c7fa]" />;
      default:
        return <FileText className="w-4 h-4 text-[#a8c7fa]" />;
    }
  };

  if (collapsed) {
    return (
      <div className="w-12 rounded-3xl bg-[#1e1f20] border border-[#3c4043]/30 flex flex-col items-center py-4 space-y-4 select-none shrink-0">
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
    <aside className="w-[320px] rounded-3xl bg-[#1e1f20] border border-[#3c4043]/30 flex flex-col h-full select-none overflow-hidden shrink-0">
      {/* Panel Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-[#e3e3e3] font-medium text-sm">Sources</h2>

        <Tooltip content="Collapse Sources panel" position="right">
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* Main Content Area */}
      <div className="px-4 py-2 flex-1 flex flex-col space-y-3.5 overflow-y-auto">
        {/* Add Sources Action Button */}
        <Tooltip content="Upload PDFs, docs, links, or text to your knowledge base" position="bottom">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="w-full bg-[#28292a] hover:bg-[#333537] text-[#e3e3e3] font-medium text-xs py-2.5 px-4 rounded-full border border-white/5 flex items-center justify-center space-x-2 transition-all duration-150 shadow-sm"
          >
            <Plus className="w-4 h-4 text-[#e3e3e3]" />
            <span>Add sources</span>
          </button>
        </Tooltip>

        {/* Web Search Box */}
        <div className="bg-[#141415] rounded-2xl p-2.5 border border-white/5 space-y-2">
          <div className="flex items-center px-1">
            <input
              type="text"
              placeholder="Search the web for new sources"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-notebook-text focus:outline-none placeholder:text-notebook-subtle"
            />
          </div>
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center space-x-1.5">
              <button className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#28292a] hover:bg-[#333537] text-[11px] text-notebook-text border border-white/5 transition-colors">
                <Globe className="w-3 h-3 text-notebook-muted" />
                <span>Web</span>
                <ChevronDown className="w-3 h-3 text-notebook-muted" />
              </button>
              <button className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-[#28292a] hover:bg-[#333537] text-[11px] text-notebook-text border border-white/5 transition-colors">
                <Sparkles className="w-3 h-3 text-notebook-muted" />
                <span>Fast research</span>
                <ChevronDown className="w-3 h-3 text-notebook-muted" />
              </button>
            </div>
            <button className="w-6 h-6 rounded-full bg-[#28292a] hover:bg-[#333537] flex items-center justify-center text-notebook-muted hover:text-notebook-text transition-colors">
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Select All Row */}
        {sources.length > 0 && (
          <div className="flex items-center justify-between px-1 text-xs text-notebook-muted">
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-notebook-subtle" />
            </div>
            <button
              onClick={() => handleSelectAll(!allSelected)}
              className="flex items-center space-x-2 hover:text-notebook-text transition-colors"
            >
              <span className="text-[11px] text-notebook-muted">Select all</span>
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  allSelected
                    ? 'bg-[#a8c7fa] border-[#a8c7fa] text-[#131314]'
                    : 'border-notebook-subtle'
                }`}
              >
                {allSelected && <Check className="w-3 h-3" />}
              </span>
            </button>
          </div>
        )}

        {/* Sources List / Empty State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-notebook-muted space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#a8c7fa]" />
            <p className="text-xs">Loading sources...</p>
          </div>
        ) : filteredSources.length > 0 ? (
          <div className="space-y-1">
            {filteredSources.map((source) => (
              <div
                key={source.id}
                onClick={() => setSelectedSourceId(source.id)}
                className="hover:bg-notebook-hover/60 px-2 py-2 rounded-xl flex items-center justify-between cursor-pointer transition-all duration-150 group"
              >
                <div className="flex items-center space-x-2.5 truncate min-w-0">
                  <div className="shrink-0 flex items-center justify-center">
                    {source.file_type === 'pdf' ? (
                      <span className="text-rose-400 font-bold text-[9px] border border-rose-400/50 rounded px-1 py-0.5">
                        PDF
                      </span>
                    ) : (
                      getFileIcon(source.file_type)
                    )}
                  </div>
                  <p className="text-xs text-notebook-text truncate group-hover:text-white">
                    {source.title}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-2">
                  <button
                    onClick={(e) => handleDelete(e, source.id, source.title)}
                    className="p-1 text-notebook-muted hover:text-rose-400 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete source"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleToggleActive(e, source)}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      source.is_active
                        ? 'bg-[#a8c7fa] border-[#a8c7fa] text-[#131314]'
                        : 'border-notebook-subtle'
                    }`}
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
            className="flex-1 border-2 border-dashed border-notebook-border/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 bg-notebook-card/20 hover:border-[#a8c7fa]/30 transition-colors cursor-pointer group min-h-[220px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-notebook-card border border-notebook-border flex items-center justify-center text-notebook-muted group-hover:text-[#a8c7fa] group-hover:scale-105 transition-all">
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
              <span>Drop files here or <span className="text-[#a8c7fa] underline">add a source</span></span>
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
