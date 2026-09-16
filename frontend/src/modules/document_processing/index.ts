export interface DocumentChunk {
  id: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}
