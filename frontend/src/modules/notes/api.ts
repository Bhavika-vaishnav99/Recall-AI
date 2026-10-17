import { authFetch } from '@/lib/apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Note {
  id: string;
  notebook_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function fetchNotes(notebookId: string): Promise<Note[]> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notebooks/${notebookId}/notes`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch notes');
  }
  return await response.json();
}

export async function createNote(
  notebookId: string,
  title: string,
  content: string
): Promise<Note> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notebooks/${notebookId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!response.ok) {
    throw new Error('Failed to create note');
  }
  return await response.json();
}

export async function updateNote(
  noteId: string,
  updates: { title?: string; content?: string }
): Promise<Note> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notes/${noteId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    throw new Error('Failed to update note');
  }
  return await response.json();
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notes/${noteId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete note');
  }
  return true;
}
