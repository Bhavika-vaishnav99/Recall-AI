'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Loader2,
  FileText,
  MoreVertical,
  Trash2,
  Pencil,
  Settings,
  Grid,
  BookOpen,
  HelpCircle,
  Folder,
  LogOut,
} from 'lucide-react';
import {
  fetchNotebooks,
  createNotebook,
  deleteNotebook,
  renameNotebook,
  Notebook,
} from '@/modules/notebooks/api';
import { useAuth } from '@/modules/auth/AuthContext';
import { SettingsModal } from '../layout/SettingsModal';

export const NotebookHome: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(!document.documentElement.classList.contains('light'));
    };
    checkTheme();
    window.addEventListener('themechange', checkTheme);
    return () => window.removeEventListener('themechange', checkTheme);
  }, []);

  const loadNotebooks = async () => {
    try {
      const data = await fetchNotebooks();
      setNotebooks(data);
    } catch (err) {
      console.error('Failed to load notebooks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotebooks();
  }, []);

  const handleCreate = async () => {
    if (creating) return;
    try {
      setCreating(true);
      const notebook = await createNotebook('Untitled notebook');
      router.push(`/notebook/${notebook.id}`);
    } catch (err) {
      console.error('Failed to create notebook:', err);
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, notebook: Notebook) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!window.confirm(`Delete '${notebook.title}'? This removes all its sources and chats.`)) return;

    try {
      await deleteNotebook(notebook.id);
      setNotebooks((prev) => prev.filter((n) => n.id !== notebook.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete notebook');
    }
  };

  const startRename = (e: React.MouseEvent, notebook: Notebook) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setRenamingId(notebook.id);
    setRenameValue(notebook.title);
  };

  const commitRename = async (notebookId: string) => {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    try {
      const updated = await renameNotebook(notebookId, title);
      setNotebooks((prev) => prev.map((n) => (n.id === notebookId ? updated : n)));
    } catch (err) {
      console.error('Failed to rename notebook:', err);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return '';
    }
  };

  /** Generates a distinct card visual icon style based on index */
  const getCardIcon = (index: number) => {
    const styles = [
      {
        bg: 'bg-slate-200 text-slate-700 border border-slate-300/60',
        icon: FileText,
      },
      {
        bg: 'bg-rose-500/20 text-rose-600 border border-rose-500/30',
        icon: HelpCircle,
      },
      {
        bg: 'bg-amber-500/20 text-amber-600 border border-amber-500/30',
        icon: BookOpen,
      },
      {
        bg: 'bg-[#a8c7fa]/10 text-[#a8c7fa] border border-[#a8c7fa]/20',
        icon: Folder,
      },
    ];
    return styles[index % styles.length];
  };

  return (
    <div
      className="relative h-screen w-screen overflow-y-auto bg-notebook-bg text-notebook-text font-sans bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: isDark ? "url('/background.jpeg')" : "url('/lightBackground.jpeg')" }}
      onClick={() => setOpenMenuId(null)}
    >
      {/* Header matching NotebookLM */}
      <header className="h-16 px-3 sm:px-6 flex items-center justify-between select-none sticky top-0 bg-notebook-bg/95 backdrop-blur-sm z-10 gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/10 shrink-0 bg-notebook-card border border-notebook-border/70 p-0.5 hover:scale-105 transition-transform">
            <img src="/logo.png" alt="Recall AI Logo" className="w-full h-full object-contain scale-110" />
          </div>
          <span className="text-base sm:text-xl font-medium tracking-tight text-notebook-text truncate">
            Recall AI Notebook
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full border border-notebook-border bg-notebook-card hover:bg-notebook-hover text-xs font-medium text-notebook-muted hover:text-notebook-text transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>

          <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full bg-notebook-card border border-amber-500/30 text-[10px] font-bold text-amber-500 tracking-wider">
            PRO
          </span>

          <button className="hidden sm:inline-flex p-2 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-full transition-colors" title="Apps">
            <Grid className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            className="p-2 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-full transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <div
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#004a77] to-[#1a6fa8] flex items-center justify-center text-white text-xs font-semibold ring-2 ring-notebook-border shrink-0"
            title={user?.email}
          >
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <h2 className="text-xl font-medium text-notebook-text mb-6">Recent notebooks</h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-notebook-muted space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#a8c7fa]" />
            <p className="text-sm">Loading notebooks...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {/* Create New Notebook Card */}
            <div
              onClick={handleCreate}
              className={`${isDark ? 'bg-zinc-700/80 hover:bg-zinc-600/80' : 'bg-purple-100/90 hover:bg-purple-200/90'} border border-notebook-border hover:border-[#a8c7fa]/30 rounded-2xl p-6 h-52 flex flex-col items-center justify-center cursor-pointer transition-all space-y-4 group select-none shadow-sm`}
            >
              <div className="w-12 h-12 rounded-full bg-notebook-card border border-notebook-border group-hover:bg-[#004a77] group-hover:border-[#a8c7fa]/40 transition-colors flex items-center justify-center text-notebook-text shadow-md">
                {creating ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : (
                  <Plus className="w-5 h-5 text-[#a8c7fa] group-hover:text-white" />
                )}
              </div>
              <span className="text-sm font-medium text-notebook-text transition-colors">
                Create new notebook
              </span>
            </div>

            {/* Existing Notebook Cards */}
            {notebooks.map((notebook, idx) => {
              const style = getCardIcon(idx);
              const IconComp = style.icon;
              return (
                <div
                  key={notebook.id}
                  onClick={() => router.push(`/notebook/${notebook.id}`)}
                  className={`${isDark ? 'bg-zinc-700/80 hover:bg-zinc-600/80' : 'bg-purple-100/90 hover:bg-purple-200/90'} border border-notebook-border hover:border-notebook-active rounded-2xl p-5 h-52 flex flex-col justify-between cursor-pointer transition-all group relative overflow-hidden shadow-sm`}
                >
                  {/* Top Bar inside card */}
                  <div className="flex items-start justify-between">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${style.bg} shadow-sm`}
                    >
                      <IconComp className="w-5 h-5" />
                    </div>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === notebook.id ? null : notebook.id);
                        }}
                        className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-all"
                        title="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === notebook.id && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 w-36 bg-notebook-card border border-notebook-border rounded-xl shadow-2xl py-1 z-20 animate-fadeIn"
                        >
                          <button
                            onClick={(e) => startRename(e, notebook)}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-notebook-text hover:bg-notebook-hover text-left"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, notebook)}
                            className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 text-left"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bottom info inside card */}
                  <div className="space-y-1.5">
                    {renamingId === notebook.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => commitRename(notebook.id)}
                        onKeyDown={(e) => e.key === 'Enter' && commitRename(notebook.id)}
                        className="w-full bg-notebook-bg text-notebook-text text-sm font-medium px-2 py-1 rounded border border-[#a8c7fa]/60 focus:outline-none"
                      />
                    ) : (
                      <h3 className="text-base font-medium text-notebook-text transition-colors line-clamp-2 leading-snug">
                        {notebook.title}
                      </h3>
                    )}
                    <p className="text-xs text-notebook-muted">
                      {formatDate(notebook.updated_at)} · {notebook.source_count} source
                      {notebook.source_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
};
