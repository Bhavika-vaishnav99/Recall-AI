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
  UserPlus,
  LogOut,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import { createNotebook } from '@/modules/notebooks/api';
import { useAuth } from '@/modules/auth/AuthContext';
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
  const { user, logout } = useAuth();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
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
        <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider text-notebook-muted border border-notebook-border px-2 py-0.5 rounded-full opacity-50 cursor-default select-none">
          PRO
        </span>

        {/* User Profile Avatar */}
        <div className="relative shrink-0">
          <button
            onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#004a77] to-[#1a6fa8] flex items-center justify-center text-[#a8c7fa] text-xs font-semibold ring-1 ring-notebook-border ml-1 cursor-pointer hover:ring-[#a8c7fa]/40 transition-all"
          >
            {user?.name || user?.email ? (user.name || user.email).charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
          </button>

          {isAccountMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsAccountMenuOpen(false)} />
              <div className="absolute right-0 top-10 w-64 bg-notebook-card rounded-2xl shadow-2xl z-40 overflow-hidden animate-fadeIn">
                <div className="p-4 flex items-center space-x-3 border-b border-notebook-border/40">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#004a77] to-[#1a6fa8] flex items-center justify-center text-[#a8c7fa] text-sm font-semibold shrink-0">
                    {user?.name || user?.email ? (user.name || user.email).charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-notebook-text truncate">{user?.name || 'Account'}</p>
                    <p className="text-xs text-notebook-muted truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="py-1.5">
                  <button
                    disabled
                    title="Multiple accounts aren't supported yet"
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-sm text-notebook-muted opacity-50 cursor-default"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add another account</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-4 py-2.5 text-sm text-notebook-text hover:bg-notebook-hover transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
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
