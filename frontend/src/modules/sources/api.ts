const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Source {
  id: string;
  notebook_id: string;
  title: string;
  file_type: 'pdf' | 'docx' | 'txt' | 'markdown' | string;
  file_size: number;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  error_message?: string | null;
  chunk_count: number;
  char_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  source_id: string;
  notebook_id: string;
  chunk_index: number;
  page_number?: number;
  text: string;
  char_count: number;
}

export interface SourceDetailResponse {
  source: Source;
  chunks: DocumentChunk[];
}

export async function uploadSourceFile(
  notebookId: string,
  file: File
): Promise<Source> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/sources/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload document source');
  }

  return await response.json();
}

export async function fetchNotebookSources(notebookId: string): Promise<Source[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/sources`,
    {
      cache: 'no-store',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch notebook sources');
  }

  return await response.json();
}

export async function fetchSourceDetail(
  sourceId: string
): Promise<SourceDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/sources/${sourceId}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch source details');
  }

  return await response.json();
}

export async function deleteSourceFile(
  notebookId: string,
  sourceId: string
): Promise<boolean> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/sources/${sourceId}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    throw new Error('Failed to delete source');
  }

  return true;
}

export async function setSourceActive(
  notebookId: string,
  sourceId: string,
  isActive: boolean
): Promise<Source> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/sources/${sourceId}/active`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update source');
  }

  return await response.json();
}

export async function setAllSourcesActive(
  notebookId: string,
  isActive: boolean
): Promise<Source[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/sources/select-all`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    }
  );

  if (!response.ok) {
    throw new Error('Failed to update sources');
  }

  return await response.json();
}
