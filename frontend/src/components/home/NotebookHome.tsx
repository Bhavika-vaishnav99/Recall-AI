'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Plus,
  Loader2,
  FileText,
  MoreVertical,
  Trash2,
  Pencil,
  Sparkles,
} from 'lucide-react';
import {
  fetchNotebooks,
  createNotebook,
  deleteNotebook,
  renameNotebook,
  Notebook,
} from '@/modules/notebooks/api';

export const NotebookHome: React.FC = () => {
  const router = useRouter();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div
      className="h-screen w-screen overflow-y-auto bg-notebook-bg text-notebook-text font-sans"
      onClick={() => setOpenMenuId(null)}
    >
      {/* Header */}
      <header className="h-16 border-b border-notebook-border px-6 flex items-center justify-between select-none sticky top-0 bg-notebook-bg z-10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <BookOpen className="w-4 h-4" />
          </div>
          <h1 className="text-lg font-medium">Recall AI</h1>
        </div>

        <div className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/30 text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-2.5 h-2.5" />
          PRO
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold">Your notebooks</h2>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex items-center space-x-2 bg-notebook-text hover:bg-white text-notebook-bg font-medium text-sm px-4 py-2.5 rounded-full transition-all hover:scale-[1.02] disabled:opacity-60"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>Create new</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-notebook-muted space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            <p className="text-sm">Loading notebooks...</p>
          </div>
        ) : notebooks.length === 0 ? (
          <div
            onClick={handleCreate}
            className="border-2 border-dashed border-notebook-border rounded-2xl p-16 flex flex-col items-center justify-center text-center space-y-3 cursor-pointer hover:border-indigo-500/40 transition-colors"
          >
            <div className="w-14 h-14 rounded-2xl bg-notebook-card border border-notebook-border flex items-center justify-center text-notebook-muted">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-base font-medium">Create your first notebook</h3>
            <p className="text-sm text-notebook-muted max-w-sm">
              Upload sources and start asking questions grounded in your own documents.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notebooks.map((notebook) => (
              <div
                key={notebook.id}
                onClick={() => router.push(`/notebook/${notebook.id}`)}
                className="relative bg-notebook-card hover:bg-notebook-hover border border-notebook-border rounded-2xl p-5 h-40 flex flex-col justify-between cursor-pointer transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-9 h-9 rounded-xl bg-notebook-bg border border-notebook-border flex items-center justify-center text-indigo-400">
                    <FileText className="w-4 h-4" />
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === notebook.id ? null : notebook.id);
                      }}
                      className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {openMenuId === notebook.id && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-8 w-36 bg-notebook-card border border-notebook-border rounded-xl shadow-xl py-1 z-20"
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

                <div>
                  {renamingId === notebook.id ? (
                    <input
                      autoFocus
                      value={renameValue}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(notebook.id)}
                      onKeyDown={(e) => e.key === 'Enter' && commitRename(notebook.id)}
                      className="w-full bg-notebook-bg text-notebook-text text-sm font-medium px-2 py-1 rounded border border-indigo-500 focus:outline-none"
                    />
                  ) : (
                    <h3 className="text-sm font-medium text-notebook-text truncate">
                      {notebook.title}
                    </h3>
                  )}
                  <p className="text-[11px] text-notebook-muted mt-1">
                    {formatDate(notebook.updated_at)} • {notebook.source_count} source
                    {notebook.source_count !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
