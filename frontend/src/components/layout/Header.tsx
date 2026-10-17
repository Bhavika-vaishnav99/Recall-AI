'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Copy,
  Share2,
  Settings,
  User,
  Check,
  ArrowLeft,
  Loader2,
  Grid3x3,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { createNotebook } from '@/modules/notebooks/api';
import { ShareNotebookModal } from './ShareNotebookModal';
import { SettingsModal } from './SettingsModal';

interface HeaderProps {
  notebookTitle: string;
  setNotebookTitle: (title: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  notebookTitle,
  setNotebookTitle,
}) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creatingNotebook, setCreatingNotebook] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateNotebook = async () => {
    if (creatingNotebook) return;
    try {
      setCreatingNotebook(true);
      const notebook = await createNotebook('Untitled notebook');
      router.push(`/notebook/${notebook.id}`);
    } catch (err) {
      console.error('Failed to create notebook:', err);
      setCreatingNotebook(false);
    }
  };

  return (
    <header className="h-14 bg-notebook-bg px-2 sm:px-4 flex items-center justify-between select-none gap-2">
      {/* Left: Logo & Notebook Title */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
        <Tooltip content="Return to Recent Notebooks dashboard" position="right">
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2.5 text-notebook-muted hover:text-notebook-text transition-colors group shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <div className="w-8 h-8 rounded-full overflow-hidden shadow-sm shrink-0 bg-notebook-card flex items-center justify-center p-1">
              <img src="/logo.png" alt="Recall AI Logo" className="w-full h-full object-contain" />
            </div>
          </button>
        </Tooltip>

        <div className="flex items-center space-x-2 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={notebookTitle}
              onChange={(e) => setNotebookTitle(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              autoFocus
              className="bg-notebook-card text-notebook-text px-2 py-1 rounded text-sm font-medium border border-[#a8c7fa]/60 focus:outline-none focus:ring-1 focus:ring-[#a8c7fa]/50 min-w-0"
            />
          ) : (
            <Tooltip content="Click to rename this notebook" position="bottom">
              <h1
                onClick={() => setIsEditing(true)}
                className="text-notebook-text font-medium text-sm hover:bg-notebook-hover px-2 py-1 rounded-lg cursor-pointer transition-colors duration-150 flex items-center gap-1.5 truncate"
              >
                {notebookTitle || 'Untitled notebook'}
              </h1>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Right: Actions & User Avatar */}
      <div className="flex items-center space-x-0.5 sm:space-x-2 shrink-0">
        <Tooltip content="Create a new untitled notebook" position="bottom">
          <button
            onClick={handleCreateNotebook}
            disabled={creatingNotebook}
            className="flex items-center space-x-1.5 hover:bg-notebook-hover text-notebook-text text-xs font-normal px-2 sm:px-3 py-1.5 rounded-full transition-colors duration-150 disabled:opacity-60"
          >
            {creatingNotebook ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:inline">Create notebook</span>
          </button>
        </Tooltip>

        <Tooltip content="Share notebook with collaborators" position="bottom">
          <button
            onClick={() => setIsShareOpen(true)}
            className="flex items-center space-x-1.5 hover:bg-notebook-hover text-notebook-text text-xs font-normal px-2 sm:px-3 py-1.5 rounded-full transition-all duration-150"
          >
            <Share2 className="w-3.5 h-3.5 stroke-[2]" />
            <span className="hidden md:inline">Share</span>
          </button>
        </Tooltip>

        <Tooltip content="Manage notebook settings and preferences" position="bottom">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-full transition-colors duration-150"
          >
            <Settings className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* PRO Label */}
        <Tooltip content="Pro plan active" position="bottom">
          <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider text-notebook-muted border border-notebook-border px-2 py-0.5 rounded-full cursor-pointer hover:border-notebook-subtle transition-colors">
            PRO
          </span>
        </Tooltip>

        <Tooltip content="Google & Recall apps" position="bottom">
          <button
            className="hidden sm:inline-flex p-2 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-full transition-colors duration-150"
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
        </Tooltip>

        {/* User Profile Avatar */}
        <Tooltip content="User account" position="bottom">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#004a77] to-[#1a6fa8] flex items-center justify-center text-[#a8c7fa] text-xs font-semibold ring-1 ring-notebook-border ml-1 cursor-pointer hover:ring-[#a8c7fa]/40 transition-all shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
        </Tooltip>
      </div>

      {isShareOpen && (
        <ShareNotebookModal
          notebookTitle={notebookTitle}
          onClose={() => setIsShareOpen(false)}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </header>
  );
};
