import type { ToolDefinition } from '../llm/ILLMService';

export interface ToolContext {
  employeeId?: string;
  sessionId: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ITool {
  readonly name: string;
  readonly description: string;
  execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult>;
  toDefinition(): ToolDefinition;
}
