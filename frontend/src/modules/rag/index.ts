const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface SearchResultItem {
  chunk_id: string;
  source_id?: string;
  source_title: string;
  notebook_id: string;
  chunk_index?: number;
  page_number?: number;
  similarity_score: number;
  char_count: number;
  text: string;
}

export interface SearchResponse {
  query: string;
  notebook_id: string;
  total_results: number;
  results: SearchResultItem[];
}

export async function searchNotebookChunks(
  notebookId: string,
  query: string,
  topK: number = 5
): Promise<SearchResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        top_k: topK,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Vector search request failed');
  }

  return await response.json();
}
