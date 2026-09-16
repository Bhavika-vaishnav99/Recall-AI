export interface SourceItem {
  id: string;
  type: 'pdf' | 'text' | 'url' | 'drive' | 'youtube';
  title: string;
  fileSize?: string;
  charCount?: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  createdAt: string;
}
