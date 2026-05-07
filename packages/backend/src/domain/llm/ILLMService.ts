import type { LLMMessage, ToolCallPayload } from './LLMMessage';

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatOptions {
  tools?: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string | null;
  toolCalls?: ToolCallPayload[];
}

export interface StreamChunk {
  delta: string;
}

export interface ILLMService {
  chat(messages: LLMMessage[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: LLMMessage[], options?: ChatOptions): AsyncIterable<StreamChunk>;
  embed(text: string): Promise<number[]>;
}
