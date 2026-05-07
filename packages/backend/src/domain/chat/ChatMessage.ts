import type { ChunkMetadata } from '../document/DocumentChunk';

export type ChatRole = 'user' | 'assistant';

export interface SourceReference {
  fileName: string;
  chunkIndex: number;
  documentId: string;
  score: number;
}

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  message: string;
  history: ChatHistoryMessage[];
  sessionId: string;
  employeeId?: string;
}

export type ChatStreamEventType = 'delta' | 'sources' | 'tool_use' | 'error' | 'done';

export type ChatStreamEvent =
  | { type: 'delta'; content: string }
  | { type: 'sources'; sources: SourceReference[] }
  | { type: 'tool_use'; toolName: string; status: 'started' | 'completed' }
  | { type: 'error'; error: string }
  | { type: 'done' };
