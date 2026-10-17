import { authFetch } from '@/lib/apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Notebook {
  id: string;
  title: string;
  source_count: number;
  cover_image: string | null;
  use_custom_summary: boolean;
  custom_summary_text: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchNotebooks(): Promise<Notebook[]> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notebooks`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch notebooks');
  }
  return await response.json();
}

export async function fetchNotebook(notebookId: string): Promise<Notebook> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notebooks/${notebookId}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch notebook');
  }
  return await response.json();
}

export async function createNotebook(title?: string): Promise<Notebook> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notebooks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    throw new Error('Failed to create notebook');
  }
  return await response.json();
}

export async function renameNotebook(notebookId: string, title: string): Promise<Notebook> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notebooks/${notebookId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    throw new Error('Failed to rename notebook');
  }
  return await response.json();
}

export interface NotebookCustomizeInput {
  title?: string;
  cover_image?: string; // base64 data URI, or '' to remove
  use_custom_summary?: boolean;
  custom_summary_text?: string;
}

export async function customizeNotebook(
  notebookId: string,
  updates: NotebookCustomizeInput
): Promise<Notebook> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notebooks/${notebookId}/customize`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update notebook');
  }
  return await response.json();
}

export async function deleteNotebook(notebookId: string): Promise<boolean> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notebooks/${notebookId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete notebook');
  }
  return true;
}

export interface NotebookSummary {
  title: string;
  summary: string;
  generated_at: string;
}

export async function fetchNotebookSummary(notebookId: string): Promise<NotebookSummary | null> {
  const response = await authFetch(`${API_BASE_URL}/api/v1/notebooks/${notebookId}/summary`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch notebook summary');
  }
  const data = await response.json();
  return data || null;
}
