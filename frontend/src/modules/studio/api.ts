const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type StudioArtifactType = 'slides' | 'report' | 'flashcards' | 'quiz' | 'datatable';

export interface FlashcardsContent {
  cards: { question: string; answer: string }[];
}

export interface QuizContent {
  questions: {
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }[];
}

export interface ReportContent {
  title: string;
  summary: string;
  sections: { heading: string; content: string }[];
}

export interface SlidesContent {
  title: string;
  slides: { title: string; bullets: string[] }[];
}

export interface DataTableContent {
  title: string;
  columns: string[];
  rows: string[][];
}

export interface StudioArtifact {
  id: string;
  notebook_id: string;
  type: StudioArtifactType;
  title: string;
  content: FlashcardsContent | QuizContent | ReportContent | SlidesContent | DataTableContent;
  created_at: string;
}

export async function generateStudioArtifact(
  notebookId: string,
  type: StudioArtifactType
): Promise<StudioArtifact> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/studio/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    }
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to generate ${type}`);
  }
  return await response.json();
}

export async function fetchStudioArtifacts(notebookId: string): Promise<StudioArtifact[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/notebooks/${notebookId}/studio`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('Failed to fetch studio outputs');
  }
  return await response.json();
}

export async function deleteStudioArtifact(artifactId: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/v1/studio/${artifactId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete studio output');
  }
  return true;
}
