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

export const Workspace: React.FC<WorkspaceProps> = ({ notebookId }) => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [sourcesCount, setSourcesCount] = useState(0);

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

      {/* 3-Panel Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden p-2.5 pt-0 gap-2.5 bg-notebook-bg">
        {/* Panel 1: Left - Sources */}
        <SourcesPanel
          notebookId={notebookId}
          onSourcesChange={(count) => setSourcesCount(count)}
        />

        {/* Panel 2: Middle - Chat & Knowledge Canvas */}
        <ChatPanel
          sourcesCount={sourcesCount}
          notebookId={notebookId}
          notebook={notebook}
          onNotebookUpdated={setNotebook}
        />

        {/* Panel 3: Right - Studio */}
        <StudioPanel notebookId={notebookId} sourcesCount={sourcesCount} />
      </div>
    </div>
  );
};
