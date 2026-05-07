export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ToolCallPayload {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMMessage {
  role: MessageRole;
  content: string | null;
  tool_calls?: ToolCallPayload[];
  tool_call_id?: string;
  name?: string;
}
