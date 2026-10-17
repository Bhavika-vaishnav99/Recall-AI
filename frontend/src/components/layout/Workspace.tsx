'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { SourcesPanel } from '../sources/SourcesPanel';
import { ChatPanel } from '../chat/ChatPanel';
import { StudioPanel } from '../studio/StudioPanel';
import { fetchNotebook, renameNotebook, Notebook } from '@/modules/notebooks/api';

interface WorkspaceProps {
  notebookId: string;
}

type MobileTab = 'sources' | 'chat' | 'studio';

export const Workspace: React.FC<WorkspaceProps> = ({ notebookId }) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [sourcesCount, setSourcesCount] = useState(0);
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');

  const loadNotebook = () => {
    fetchNotebook(notebookId)
      .then(setNotebook)
      .catch((err) => console.error('Failed to load notebook:', err));
  };

  useEffect(() => {
    loadNotebook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebookId]);

  const handleRenameNotebook = async (title: string) => {
    setNotebook((prev) => (prev ? { ...prev, title } : prev));
    try {
      await renameNotebook(notebookId, title);
    } catch (err) {
      console.error('Failed to rename notebook:', err);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-notebook-bg text-notebook-text font-sans overflow-hidden">
      {/* Top Header */}
      <Header
        notebookTitle={notebook?.title || 'Untitled notebook'}
        setNotebookTitle={handleRenameNotebook}
      />

      {/* Mobile Tab Switcher - below md: only */}
      <div className="md:hidden flex items-center gap-1 px-2.5 pb-2 shrink-0">
        {([
          { id: 'sources', label: 'Sources' },
          { id: 'chat', label: 'Chat' },
          { id: 'studio', label: 'Studio' },
        ] as { id: MobileTab; label: string }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMobileTab(tab.id)}
            className={`flex-1 text-xs font-medium py-2 rounded-full transition-colors ${
              mobileTab === tab.id
                ? 'bg-notebook-active text-notebook-text'
                : 'bg-notebook-card text-notebook-muted hover:text-notebook-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3-Panel Main Workspace Body (md: and up); single-panel tabs below md: */}
      <div className="flex-1 flex overflow-hidden p-2.5 pt-0 gap-2.5 bg-notebook-bg">
        {/* Panel 1: Left - Sources */}
        <div className={`${mobileTab === 'sources' ? 'flex' : 'hidden'} md:flex w-full md:w-auto`}>
          <SourcesPanel
            notebookId={notebookId}
            onSourcesChange={(count) => setSourcesCount(count)}
          />
        </div>

        {/* Panel 2: Middle - Chat & Knowledge Canvas */}
        <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 w-full md:w-auto overflow-hidden`}>
          <ChatPanel
            sourcesCount={sourcesCount}
            notebookId={notebookId}
            notebook={notebook}
            onNotebookUpdated={setNotebook}
          />
        </div>

        {/* Panel 3: Right - Studio */}
        <div className={`${mobileTab === 'studio' ? 'flex' : 'hidden'} md:flex w-full md:w-auto`}>
          <StudioPanel notebookId={notebookId} sourcesCount={sourcesCount} />
        </div>
      </div>
    </div>
  );
};
