'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Copy,
  BarChart3,
  Share2,
  Settings,
  User,
  Check,
  ArrowLeft,
  Loader2,
  Grid3x3,
} from 'lucide-react';
import { createNotebook } from '@/modules/notebooks/api';

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
    <header className="h-14 border-b border-notebook-border bg-notebook-bg px-4 flex items-center justify-between select-none">
      {/* Left: Logo & Notebook Title */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-notebook-muted hover:text-notebook-text transition-colors"
          title="Back to notebooks"
        >
          <ArrowLeft className="w-4 h-4" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
        </button>

        <div className="flex items-center space-x-2">
          {isEditing ? (
            <input
              type="text"
              value={notebookTitle}
              onChange={(e) => setNotebookTitle(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              autoFocus
              className="bg-notebook-card text-notebook-text px-2 py-1 rounded text-sm font-medium border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          ) : (
            <h1
              onClick={() => setIsEditing(true)}
              className="text-notebook-text font-medium text-sm hover:bg-notebook-hover px-2 py-1 rounded cursor-pointer transition-colors duration-150 flex items-center gap-1.5"
              title="Click to rename"
            >
              {notebookTitle || 'Untitled notebook'}
            </h1>
          )}
        </div>
      </div>

      {/* Right: Actions & User Avatar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleCreateNotebook}
          disabled={creatingNotebook}
          className="flex items-center space-x-1.5 bg-notebook-text hover:bg-white text-notebook-bg text-xs font-medium px-3.5 py-2 rounded-full transition-colors duration-150 disabled:opacity-60"
        >
          {creatingNotebook ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          <span>Create notebook</span>
        </button>

        <button
          onClick={handleCopyLink}
          className="flex items-center space-x-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover px-3 py-2 rounded-full transition-colors duration-150 text-xs font-medium"
          title="Copy Notebook Link"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>Copy</span>
        </button>

        <button
          className="flex items-center space-x-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover px-3 py-2 rounded-full transition-colors duration-150 text-xs font-medium"
          title="Analytics"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </button>

        <button
          className="flex items-center space-x-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover px-3 py-2 rounded-full transition-colors duration-150 text-xs font-medium"
          title="Share Notebook"
        >
          <Share2 className="w-4 h-4" />
          <span>Share</span>
        </button>

        <button
          className="flex items-center space-x-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover px-3 py-2 rounded-full transition-colors duration-150 text-xs font-medium"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>

        {/* PRO Label */}
        <span className="text-[11px] font-medium text-notebook-muted px-1">PRO</span>

        <button
          className="p-2 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-full transition-colors duration-150"
          title="Apps"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>

        {/* User Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-notebook-border ml-1 cursor-pointer hover:ring-indigo-500 transition-all">
          <User className="w-4 h-4" />
        </div>
      </div>
    </header>
  );
};
