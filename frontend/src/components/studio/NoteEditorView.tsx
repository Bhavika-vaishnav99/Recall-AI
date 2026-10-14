'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Trash2, Loader2, Check, X } from 'lucide-react';
import { Note, createNote, updateNote, deleteNote } from '@/modules/notes/api';

interface NoteEditorViewProps {
  notebookId: string;
  note: Note | null; // null means creating a new note
  onSaved: (note: Note) => void;
  onDeleted: (noteId: string) => void;
  onClose?: () => void;
}

export const NoteEditorView: React.FC<NoteEditorViewProps> = ({
  notebookId,
  note,
  onSaved,
  onDeleted,
  onClose,
}) => {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [noteId, setNoteId] = useState<string | null>(note?.id || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTitle(note?.title || '');
    setContent(note?.content || '');
    setNoteId(note?.id || null);
  }, [note?.id]);

  const persist = async (nextTitle: string, nextContent: string) => {
    setSaving(true);
    try {
      if (noteId) {
        const updated = await updateNote(noteId, { title: nextTitle, content: nextContent });
        onSaved(updated);
      } else {
        if (!nextTitle.trim() && !nextContent.trim()) return;
        const created = await createNote(notebookId, nextTitle, nextContent);
        setNoteId(created.id);
        onSaved(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  };

  const scheduleSave = (nextTitle: string, nextContent: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(nextTitle, nextContent), 700);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    scheduleSave(value, content);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    scheduleSave(title, value);
  };

  const handleDelete = async () => {
    if (!noteId) return;
    if (!window.confirm('Delete this note?')) return;
    try {
      await deleteNote(noteId);
      onDeleted(noteId);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-notebook-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2 text-[11px] text-notebook-muted">
          {saving && <Loader2 className="w-3 h-3 animate-spin" />}
          {saved && !saving && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {noteId && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-notebook-muted hover:text-rose-400 hover:bg-notebook-hover rounded-lg transition-colors"
              title="Delete note"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-notebook-muted hover:text-notebook-text hover:bg-notebook-hover rounded-lg transition-colors"
              title="Close note"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Note title"
          className="w-full bg-transparent text-notebook-text text-lg font-semibold focus:outline-none placeholder:text-notebook-subtle"
        />
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Start writing..."
          autoFocus
          className="flex-1 w-full bg-transparent text-notebook-text text-sm leading-relaxed focus:outline-none placeholder:text-notebook-subtle resize-none"
        />
      </div>
    </div>
  );
};
