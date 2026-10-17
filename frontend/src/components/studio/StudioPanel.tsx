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
  X,
  MoreVertical,
  Maximize2,
} from 'lucide-react';
import {
  generateStudioArtifact,
  fetchStudioArtifacts,
  deleteStudioArtifact,
  StudioArtifact,
  StudioArtifactType,
  StudioGenerateOptions,
} from '@/modules/studio/api';
import { fetchNotes, Note } from '@/modules/notes/api';
import { Tooltip } from '@/components/ui/Tooltip';
import { StudioArtifactView } from './StudioArtifactView';
import { NoteEditorView } from './NoteEditorView';
import { StudioGenerateDialog } from './StudioGenerateDialog';

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
  tooltip: string;
}

// NotebookLM tools ordered matching reference UI
const studioTools: StudioTool[] = [
  { id: 'report', label: 'Reports', icon: FileSpreadsheet, color: 'text-rose-400', tint: 'bg-rose-500/15', enabled: true, tooltip: 'Generate a report based on your sources' },
  { id: 'audio', label: 'Audio Overview', icon: Sparkles, color: 'text-[#a8c7fa]', tint: 'bg-[#a8c7fa]/15', enabled: false, tooltip: 'Generate an AI podcast based on your sources' },
  { id: 'slides', label: 'Slide deck', icon: Presentation, color: 'text-purple-500', tint: 'bg-purple-500/15', enabled: true, tooltip: 'Generate a slide deck based on your sources' },
  { id: 'video', label: 'Video Overview', icon: Video, color: 'text-emerald-400', tint: 'bg-emerald-500/15', enabled: false, tooltip: 'Generate a Video Overview based on your sources' },
  { id: 'flashcards', label: 'Flashcards', icon: Layers, color: 'text-amber-600', tint: 'bg-amber-500/15', enabled: true, tooltip: 'Generate flashcards based on your sources' },
  { id: 'mindmap', label: 'Mind Map', icon: GitBranch, color: 'text-cyan-400', tint: 'bg-cyan-500/15', enabled: false, tooltip: 'Generate a mind map based on your sources' },
  { id: 'datatable', label: 'Data table', icon: Table, color: 'text-[#a8c7fa]', tint: 'bg-[#a8c7fa]/15', enabled: true, tooltip: 'Generate a data table based on your sources' },
  { id: 'infographic', label: 'Infographic', icon: BarChart3, color: 'text-amber-400', tint: 'bg-amber-400/15', enabled: false, tooltip: 'Generate an AI infographic based on your sources' },
  { id: 'quiz', label: 'Quiz', icon: HelpCircle, color: 'text-blue-400', tint: 'bg-blue-500/15', enabled: true, tooltip: 'Generate a quiz based on your sources' },
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
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(!document.documentElement.classList.contains('light'));
    };
    checkTheme();
    window.addEventListener('themechange', checkTheme);
    return () => window.removeEventListener('themechange', checkTheme);
  }, []);
  const [artifacts, setArtifacts] = useState<StudioArtifact[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState<StudioArtifactType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<StudioArtifact | null>(null);
  const [activeNote, setActiveNote] = useState<Note | null | 'new'>(null);
  const [configuringTool, setConfiguringTool] = useState<StudioTool | null>(null);

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

  const handleGenerate = async (
    tool: StudioTool,
    options: StudioGenerateOptions,
    defer: boolean
  ) => {
    if (!tool.enabled || generatingType) return;
    const artifactType = tool.id as StudioArtifactType;
    setError(null);
    setGeneratingType(artifactType);
    try {
      const artifact = await generateStudioArtifact(notebookId, artifactType, options, defer);
      setArtifacts((prev) => [artifact, ...prev]);
      setConfiguringTool(null);
      // A deferred job has no content yet, so stay on the list instead of opening it.
      if (!defer) setSelectedArtifact(artifact);
    } catch (err: any) {
      setError(err.message || `Failed to generate ${tool.label}`);
      setConfiguringTool(null);
    } finally {
      setGeneratingType(null);
    }
  };

  const usedToday = artifacts.filter(
    (a) => new Date(a.created_at).toDateString() === new Date().toDateString()
  ).length;

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
      <div className="w-12 rounded-3xl bg-notebook-card border border-notebook-border/60 flex flex-col items-center py-4 space-y-4 select-none shrink-0">
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
      className={`${manualWidth ? '' : isPanelExpanded ? 'w-full md:w-[480px]' : 'w-full md:w-[350px]'
        } rounded-3xl bg-notebook-card flex flex-col h-full select-none relative shrink-0 overflow-hidden ${manualWidth ? '' : 'transition-all duration-200'
        }`}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleResizeStart}
        className="absolute left-0 top-0 bottom-0 w-1.5 -ml-0.5 cursor-col-resize hover:bg-notebook-border/60 z-20 transition-colors"
        title="Drag to resize"
      />

      {/* Panel Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between shrink-0">
        {isPanelExpanded ? (
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => {
                setSelectedArtifact(null);
                setActiveNote(null);
              }}
              className="text-notebook-muted hover:text-notebook-text transition-colors"
              title="Return to Studio overview"
            >
              Studio
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-notebook-subtle" />
            <span className="text-notebook-text font-normal">
              {activeNote !== null
                ? 'Note'
                : selectedArtifact?.type === 'report'
                  ? 'Interactive Report'
                  : selectedArtifact?.type === 'slides'
                    ? 'Slide Deck'
                    : selectedArtifact?.type === 'quiz'
                      ? 'Quiz'
                      : selectedArtifact?.type === 'flashcards'
                        ? 'Flashcards'
                        : selectedArtifact?.type === 'datatable'
                          ? 'Data Table'
                          : 'Interactive Report'}
            </span>
          </div>
        ) : (
          <h2 className="text-notebook-text font-medium text-sm">Studio</h2>
        )}
        <div className="flex items-center space-x-1">
          {isPanelExpanded ? (
            <Tooltip content="Expand view to full screen" position="left">
              <button
                onClick={() => {
                  const expandBtn = document.getElementById('studio-artifact-maximize-btn');
                  if (expandBtn) expandBtn.click();
                }}
                className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          ) : (
            <Tooltip content="Collapse Studio panel" position="left">
              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {selectedArtifact ? (
        <StudioArtifactView
          artifact={selectedArtifact}
          sourceCount={sourcesCount}
          onClose={() => setSelectedArtifact(null)}
        />
      ) : activeNote !== null ? (
        <NoteEditorView
          notebookId={notebookId}
          note={activeNote === 'new' ? null : activeNote}
          onSaved={handleNoteSaved}
          onDeleted={handleNoteDeleted}
          onClose={() => setActiveNote(null)}
        />
      ) : (
        <div className="px-4 py-2 flex-1 flex flex-col space-y-3 overflow-y-auto pb-4">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start space-x-2 text-rose-300 text-[11px]">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Multilingual Audio Overview Banner */}
          <div className="text-[11px] text-notebook-text leading-relaxed px-3 py-2.5 rounded-xl bg-[#a8c7fa]/10 border border-[#a8c7fa]/20">
            <span className="font-medium">Create an Audio Overview in: </span>
            <span className="text-[#a8c7fa]/90">हिन्दी, বাংলা, ગુજરાતી, ಕನ್ನಡ, മലയാളം, मराठी, ਪੰਜਾਬੀ, தமிழ், తెలుగు</span>
          </div>

          {/* Studio Action Tiles Grid — rounded capsules */}
          <div className="grid grid-cols-2 gap-1.5">
            {studioTools.map((tool) => {
              const IconComponent = tool.icon;
              const isGenerating = generatingType === tool.id;
              return (
                <Tooltip
                  key={tool.id}
                  content={tool.tooltip}
                  position="bottom"
                  className={tool.id === 'datatable' ? 'col-span-1' : ''}
                >
                  <button
                    onClick={() => tool.enabled && setConfiguringTool(tool)}
                    disabled={!tool.enabled || generatingType !== null}
                    className={`w-full bg-black hover:bg-zinc-900 rounded-full px-3 py-2 flex items-center gap-2 text-left transition-all ${tool.enabled
                      ? 'cursor-pointer'
                      : 'opacity-70 cursor-pointer'
                      } disabled:hover:bg-notebook-hover`}
                  >
                    {isGenerating ? (
                      <Loader2 className={`w-3.5 h-3.5 animate-spin shrink-0 ${tool.color}`} />
                    ) : (
                      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${tool.color}`} />
                    )}
                    <span className="text-[10.5px] font-medium text-notebook-text truncate">
                      {tool.label}
                    </span>
                    {['audio', 'video', 'mindmap', 'infographic'].includes(tool.id) && (
                      <span className="text-[8px] font-medium text-notebook-muted bg-notebook-active/90 px-1.5 py-0.5 rounded-full ml-auto shrink-0 leading-none whitespace-nowrap">
                        Coming soon
                      </span>
                    )}
                    {tool.id === 'report' && (
                      <span className="text-[9px] font-semibold text-[#a8c7fa] bg-[#004a77] px-1.5 py-0.2 rounded-full ml-auto shrink-0">
                        New!
                      </span>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {/* Saved Outputs + Notes List — flat rows like NotebookLM */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-notebook-muted space-y-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#a8c7fa]" />
              <p className="text-xs">Loading studio outputs...</p>
            </div>
          ) : artifacts.length > 0 || notes.length > 0 ? (
            <div className="space-y-0.5 pt-2">
              {notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveNote(note)}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-notebook-hover/60 cursor-pointer transition-all group"
                >
                  <StickyNote className="w-4 h-4 text-notebook-muted shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-normal text-notebook-text truncate">
                      {note.title || 'New note'}
                    </p>
                    <p className="text-[10px] text-notebook-muted">{relativeTime(note.updated_at)}</p>
                  </div>
                  <div className="p-1 text-notebook-subtle rounded shrink-0 opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}

              {artifacts.map((artifact) => {
                const tool = studioTools.find((t) => t.id === artifact.type);
                const Icon = tool?.icon || Layers;
                return (
                  <div
                    key={artifact.id}
                    onClick={() => artifact.status !== 'scheduled' && setSelectedArtifact(artifact)}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-notebook-hover/60 cursor-pointer transition-all group"
                  >
                    <Icon className={`w-4 h-4 ${tool?.color || 'text-[#a8c7fa]'} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-normal text-notebook-text truncate">
                        {artifact.title}
                      </p>
                      <p className="text-[10px] text-notebook-muted">
                        {artifact.status === 'scheduled' && artifact.scheduled_for
                          ? `Scheduled for ${new Date(artifact.scheduled_for).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
                          : artifact.status === 'failed'
                            ? 'Generation failed'
                            : `${sourcesCount} source${sourcesCount !== 1 ? 's' : ''} · ${relativeTime(artifact.created_at)}`}
                      </p>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#a8c7fa] shrink-0" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteArtifact(artifact.id); }}
                      className="p-1 text-notebook-subtle hover:text-notebook-text rounded transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                      title="Options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 min-h-[120px] rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-2">
              <Sparkles className="w-5 h-5 text-notebook-subtle" />
              <p className="text-xs font-medium text-notebook-text">Studio output will be saved here.</p>
              <p className="text-[11px] text-notebook-muted leading-relaxed max-w-[200px]">
                After adding sources, click to add Audio Overview, study guide, mind map and more!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generation options dialog */}
      {configuringTool && (
        <StudioGenerateDialog
          notebookId={notebookId}
          // Disabled tiles can't be clicked, so this is always a real artifact type.
          tool={{ ...configuringTool, id: configuringTool.id as StudioArtifactType }}
          generating={generatingType !== null}
          usedToday={usedToday}
          onClose={() => !generatingType && setConfiguringTool(null)}
          onGenerate={(options, defer) => handleGenerate(configuringTool, options, defer)}
        />
      )}

      {/* Sticky Add Note Footer — pinned bottom right */}
      {!isPanelExpanded && (
        <div className="p-3 pt-0 flex justify-end shrink-0">
          <button
            onClick={() => setActiveNote('new')}
            className="flex items-center gap-1.5 bg-notebook-hover hover:bg-notebook-active text-notebook-text text-xs font-medium py-2 px-3.5 rounded-full transition-colors shadow-sm"
          >
            <StickyNote className="w-3.5 h-3.5 text-amber-300" />
            <span>Add note</span>
          </button>
        </div>
      )}
    </aside>
  );
};
