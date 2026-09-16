export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourcesUsed?: string[];
}
