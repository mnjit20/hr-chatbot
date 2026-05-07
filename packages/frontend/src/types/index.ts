export type MessageRole = 'user' | 'assistant';

export interface SourceReference {
  fileName: string;
  chunkIndex: number;
  documentId: string;
  score: number;
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  sources?: SourceReference[];
  isStreaming?: boolean;
  toolsUsed?: string[];
  error?: boolean;
  timestamp: Date;
}

export interface UploadedDocument {
  documentId: string;
  fileName: string;
  chunksCreated: number;
  uploadedAt: Date;
}

export type ChatStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'sources'; sources: SourceReference[] }
  | { type: 'tool_use'; toolName: string; status: 'started' | 'completed' }
  | { type: 'error'; error: string }
  | { type: 'done' };
