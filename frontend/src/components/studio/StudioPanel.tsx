'use client';

import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  ChevronLeft,
  Presentation,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Table,
  Mic,
  Video,
  GitBranch,
  BarChart3,
  PanelRightClose,
  PanelRightOpen,
  Loader2,
  AlertCircle,
  Sparkles,
  Trash2,
  Plus,
  StickyNote,
} from 'lucide-react';
import {
  generateStudioArtifact,
  fetchStudioArtifacts,
  deleteStudioArtifact,
  StudioArtifact,
  StudioArtifactType,
} from '@/modules/studio/api';
import { fetchNotes, Note } from '@/modules/notes/api';
import { StudioArtifactView } from './StudioArtifactView';
import { NoteEditorView } from './NoteEditorView';

interface StudioPanelProps {
  notebookId: string;
  sourcesCount?: number;
}

interface StudioTool {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  tint: string;
  enabled: boolean;
}

const studioTools: StudioTool[] = [
  { id: 'audio', label: 'Audio Overview', icon: Mic, color: 'text-indigo-400', tint: 'bg-indigo-500/5', enabled: false },
  { id: 'slides', label: 'Slide deck', icon: Presentation, color: 'text-amber-400', tint: 'bg-amber-500/5', enabled: true },
  { id: 'video', label: 'Video Overview', icon: Video, color: 'text-emerald-400', tint: 'bg-emerald-500/5', enabled: false },
  { id: 'mindmap', label: 'Mind Map', icon: GitBranch, color: 'text-purple-400', tint: 'bg-purple-500/5', enabled: false },
  { id: 'report', label: 'Reports', icon: FileSpreadsheet, color: 'text-sky-400', tint: 'bg-sky-500/5', enabled: true },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, color: 'text-rose-400', tint: 'bg-rose-500/5', enabled: true },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'text-teal-400', tint: 'bg-teal-500/5', enabled: true },
  { id: 'infographic', label: 'Infographic', icon: BarChart3, color: 'text-fuchsia-400', tint: 'bg-fuchsia-500/5', enabled: false },
  { id: 'datatable', label: 'Data table', icon: Table, color: 'text-indigo-300', tint: 'bg-indigo-500/5', enabled: true },
];

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const StudioPanel: React.FC<StudioPanelProps> = ({ notebookId, sourcesCount = 0 }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [artifacts, setArtifacts] = useState<StudioArtifact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<StudioArtifactType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<StudioArtifact | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null | 'new'>(null);

  const loadArtifacts = async () => {
    try {
      const [artifactData, noteData] = await Promise.all([
        fetchStudioArtifacts(notebookId),
        fetchNotes(notebookId),
      ]);
      setArtifacts(artifactData);
      setNotes(noteData);
    } catch (err) {
      console.error('Failed to load studio outputs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArtifacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId]);

  const handleGenerate = async (tool: StudioTool) => {
    if (!tool.enabled || generatingType) return;
    const artifactType = tool.id as StudioArtifactType;
    setError(null);
    setGeneratingType(artifactType);
    try {
      const artifact = await generateStudioArtifact(notebookId, artifactType);
      setArtifacts((prev) => [artifact, ...prev]);
      setSelectedArtifact(artifact);
    } catch (err: any) {
      setError(err.message || `Failed to generate ${tool.label}`);
    } finally {
      setGeneratingType(null);
    }
  };

  const handleDeleteArtifact = async (artifactId: string) => {
    try {
      await deleteStudioArtifact(artifactId);
      setArtifacts((prev) => prev.filter((a) => a.id !== artifactId));
      setSelectedArtifact((prev) => (prev?.id === artifactId ? null : prev));
    } catch (err) {
      console.error('Failed to delete studio output:', err);
    }
  };

  const handleNoteSaved = (note: Note) => {
    setNotes((prev) => {
      const exists = prev.some((n) => n.id === note.id);
      return exists ? prev.map((n) => (n.id === note.id ? note : n)) : [note, ...prev];
    });
    setActiveNote(note);
  };

  const handleNoteDeleted = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    setActiveNote(null);
  };

  const isPanelExpanded = !!selectedArtifact || activeNote !== null;

  const [manualWidth, setManualWidth] = useState<number | null>(null);
  const asideRef = React.useRef<HTMLElement>(null);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = asideRef.current?.offsetWidth || (isPanelExpanded ? 440 : 320);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const nextWidth = Math.min(720, Math.max(280, startWidth + delta));
      setManualWidth(nextWidth);
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  if (collapsed) {
    return (
      <div className="w-12 border-l border-notebook-border bg-notebook-bg flex flex-col items-center py-4 space-y-4 select-none">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
          title="Expand Studio Panel"
        >
          <PanelRightOpen className="w-4 h-4" />
        </button>
        <div className="text-xs font-semibold text-notebook-muted tracking-wider uppercase rotate-90 my-6">
          Studio
        </div>
      </div>
    );
  }

  return (
    <aside
      ref={asideRef}
      style={manualWidth ? { width: manualWidth } : undefined}
      className={`${
        manualWidth ? '' : isPanelExpanded ? 'w-[440px]' : 'w-80'
      } border-l border-notebook-border bg-notebook-bg flex flex-col h-full select-none relative shrink-0 ${
        manualWidth ? '' : 'transition-all duration-200'
      }`}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-col-resize hover:bg-indigo-500/40 z-20 transition-colors"
        title="Drag to resize"
      />

      {/* Panel Header */}
      <div className="p-4 flex items-center justify-between border-b border-notebook-border/50 shrink-0">
        {isPanelExpanded ? (
          <div className="flex items-center space-x-1 text-sm">
            <button
              onClick={() => {
                setSelectedArtifact(null);
                setActiveNote(null);
              }}
              className="flex items-center text-notebook-muted hover:text-notebook-text transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="font-semibold">Studio</span>
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-notebook-subtle" />
            <span className="text-notebook-text font-medium">{activeNote !== null ? 'Note' : 'App'}</span>
          </div>
        ) : (
          <h2 className="text-notebook-text font-semibold text-sm">Studio</h2>
        )}
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
          title="Collapse Studio Panel"
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      {selectedArtifact ? (
        <StudioArtifactView artifact={selectedArtifact} sourceCount={sourcesCount} />
      ) : activeNote !== null ? (
        <NoteEditorView
          notebookId={notebookId}
          note={activeNote === 'new' ? null : activeNote}
          onSaved={handleNoteSaved}
          onDeleted={handleNoteDeleted}
        />
      ) : (
        <div className="p-4 flex-1 flex flex-col space-y-4 overflow-y-auto pb-20">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start space-x-2 text-rose-300 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Studio Action Tiles Grid */}
          <div className="grid grid-cols-2 gap-2">
            {studioTools.map((tool) => {
              const IconComponent = tool.icon;
              const isGenerating = generatingType === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => handleGenerate(tool)}
                  disabled={!tool.enabled || generatingType !== null}
                  title={tool.enabled ? undefined : 'Coming soon'}
                  className={`${tool.tint} border border-notebook-border hover:border-notebook-subtle rounded-xl p-3 flex flex-col justify-between h-20 text-left transition-all duration-150 group ${
                    tool.enabled ? 'hover:bg-notebook-hover' : 'opacity-50 cursor-not-allowed'
                  } disabled:hover:bg-transparent`}
                >
                  <div className="flex items-center justify-between w-full">
                    {isGenerating ? (
                      <Loader2 className={`w-4 h-4 animate-spin ${tool.color}`} />
                    ) : (
                      <IconComponent className={`w-4 h-4 ${tool.color}`} />
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-notebook-subtle group-hover:text-notebook-text transition-colors" />
                  </div>
                  <span className="text-[11px] font-medium text-notebook-text group-hover:text-white">
                    {isGenerating ? 'Generating…' : tool.label}
                  </span>
                  {!tool.enabled && (
                    <span className="text-[9px] text-notebook-subtle uppercase tracking-wide">Coming soon</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Saved Outputs + Notes List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-notebook-muted space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              <p className="text-xs">Loading studio outputs...</p>
            </div>
          ) : artifacts.length > 0 || notes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-notebook-muted uppercase tracking-wider">
                Saved outputs
              </p>
              {artifacts.map((artifact) => {
                const tool = studioTools.find((t) => t.id === artifact.type);
                const Icon = tool?.icon || Layers;
                return (
                  <div
                    key={artifact.id}
                    onClick={() => setSelectedArtifact(artifact)}
                    className="bg-notebook-card hover:bg-notebook-hover border border-notebook-border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all group"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div className="w-7 h-7 rounded-lg bg-notebook-bg border border-notebook-border flex items-center justify-center shrink-0">
                        <Icon className={`w-3.5 h-3.5 ${tool?.color || 'text-indigo-400'}`} />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium text-notebook-text truncate group-hover:text-white">
                          {artifact.title}
                        </p>
                        <p className="text-[10px] text-notebook-muted">
                          {sourcesCount} source{sourcesCount !== 1 ? 's' : ''} · {relativeTime(artifact.created_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteArtifact(artifact.id);
                      }}
                      className="p-1 text-notebook-muted hover:text-rose-400 rounded transition-colors shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}

              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className="bg-notebook-card hover:bg-notebook-hover border border-notebook-border rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all group"
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-notebook-bg border border-notebook-border flex items-center justify-center shrink-0">
                      <StickyNote className="w-3.5 h-3.5 text-amber-300" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-medium text-notebook-text truncate group-hover:text-white">
                        {note.title || 'Untitled note'}
                      </p>
                      <p className="text-[10px] text-notebook-muted">{relativeTime(note.updated_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 min-h-[140px] rounded-2xl border border-notebook-border/40 bg-notebook-card/20 p-6 flex flex-col items-center justify-center text-center space-y-2">
              <Sparkles className="w-6 h-6 text-notebook-subtle" />
              <p className="text-xs font-medium text-notebook-text">
                Studio output will be saved here.
              </p>
              <p className="text-[11px] text-notebook-muted leading-relaxed max-w-[200px]">
                After adding sources, click a tile above to generate a slide deck, report, flashcards, quiz, or data table.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sticky Add Note Button */}
      {!isPanelExpanded && (
        <div className="absolute bottom-4 right-4 z-10">
          <button
            onClick={() => setActiveNote('new')}
            className="bg-notebook-text hover:bg-white text-notebook-bg font-semibold text-xs py-2 px-4 rounded-full shadow-lg flex items-center space-x-1.5 hover:scale-105 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add note</span>
          </button>
        </div>
      )}
    </aside>
  );
};
