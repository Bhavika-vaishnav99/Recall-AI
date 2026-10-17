import { authFetch } from '@/lib/apiClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Citation {
  source_id: string;
  source_name: string;
  page?: number;
  chunk_id: string;
  chunk_index?: number;
  similarity_score: number;
  text: string;
}

export interface ChatResponse {
  conversation_id: string;
  answer: string;
  citations: Citation[];
  sources_used: string[];
}

export interface Conversation {
  id: string;
  notebook_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  notebook_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  sources_used?: string[];
  created_at: string;
}

export async function sendChatMessage(
  notebookId: string,
  message: string,
  conversationId?: string
): Promise<ChatResponse> {
  const response = await authFetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'RAG Chat request failed');
  }

  return await response.json();
}

export async function fetchNotebookConversations(
  notebookId: string
): Promise<Conversation[]> {
  const response = await authFetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/chat/conversations`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch conversations');
  }

  return await response.json();
}

export async function fetchConversationHistory(
  notebookId: string,
  conversationId: string
): Promise<MessageItem[]> {
  const response = await authFetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/chat/conversations/${conversationId}`,
    { cache: 'no-store' }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch message history');
  }

  return await response.json();
}

export async function startNewConversation(
  notebookId: string
): Promise<Conversation> {
  const response = await authFetch(
    `${API_BASE_URL}/api/v1/notebooks/${notebookId}/chat/conversations/new`,
    { method: 'POST' }
  );

  if (!response.ok) {
    throw new Error('Failed to start new conversation');
  }

  return await response.json();
}
