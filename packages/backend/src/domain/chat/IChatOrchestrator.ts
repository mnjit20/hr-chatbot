import type { ChatRequest, ChatStreamEvent } from './ChatMessage';

export interface IChatOrchestrator {
  chat(request: ChatRequest): AsyncIterable<ChatStreamEvent>;
}
