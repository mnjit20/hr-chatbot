import type { ITool } from '../../domain/tool/ITool';
import type { ToolDefinition } from '../../domain/llm/ILLMService';

/**
 * Central registry for all available tools.
 * The orchestrator queries this to build the tool list sent to the LLM.
 * Adding a new tool = add one line in the DI container.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ITool>();

  constructor(tools: ITool[] = []) {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  register(tool: ITool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  getTool(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ITool[] {
    return Array.from(this.tools.values());
  }

  getDefinitions(): ToolDefinition[] {
    return this.getAllTools().map((t) => t.toDefinition());
  }
}
