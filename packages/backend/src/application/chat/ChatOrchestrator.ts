import type { IChatOrchestrator } from '../../domain/chat/IChatOrchestrator';
import type { ChatRequest, ChatStreamEvent, SourceReference } from '../../domain/chat/ChatMessage';
import type { ILLMService } from '../../domain/llm/ILLMService';
import type { LLMMessage } from '../../domain/llm/LLMMessage';
import type { RetrievalService } from '../retrieval/RetrievalService';
import type { ToolRegistry } from '../../infrastructure/tools/ToolRegistry';
import type { PromptBuilder } from './PromptBuilder';
import { MAX_TOOL_ITERATIONS } from '../../config/constants';
import { toAppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'ChatOrchestrator' });

/**
 * The central use-case that ties together retrieval, tool calling, and generation.
 *
 * Flow:
 *  1. Retrieve relevant document chunks (RAG)
 *  2. Build prompt with context + tool definitions
 *  3. First LLM call — may return tool calls
 *  4. Agentic loop: resolve tool calls, feed results back, repeat (max N times)
 *  5. Stream final text response
 *  6. Emit source references as a final event
 */
export class ChatOrchestrator implements IChatOrchestrator {
  constructor(
    private readonly llm: ILLMService,
    private readonly retrieval: RetrievalService,
    private readonly toolRegistry: ToolRegistry,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async *chat(request: ChatRequest): AsyncIterable<ChatStreamEvent> {
    log.info({ sessionId: request.sessionId, msgLength: request.message.length }, 'Chat request');

    try {
      // Step 1: Retrieve document context
      const context = await this.retrieval.retrieve(request.message);

      // Step 2: Build messages with context
      const messages: LLMMessage[] = this.promptBuilder.buildMessages(request, context);
      const toolDefinitions = this.toolRegistry.getDefinitions();

      // Step 3: Initial LLM call (non-streaming, may have tool calls)
      let response = await this.llm.chat(messages, { tools: toolDefinitions });

      // Step 4: Agentic tool loop
      let iterations = 0;
      while (response.toolCalls && response.toolCalls.length > 0 && iterations < MAX_TOOL_ITERATIONS) {
        iterations++;
        log.debug({ iterations, toolCount: response.toolCalls.length }, 'Tool call iteration');

        // Add assistant's tool-calling message to history
        messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.toolCalls,
        });

        // Execute each tool call
        for (const toolCall of response.toolCalls) {
          yield { type: 'tool_use', toolName: toolCall.function.name, status: 'started' };

          const tool = this.toolRegistry.getTool(toolCall.function.name);

          let resultContent: string;
          if (!tool) {
            resultContent = JSON.stringify({ error: `Unknown tool: ${toolCall.function.name}` });
          } else {
            let params: Record<string, unknown> = {};
            let parseError = false;
            try {
              params = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
            } catch {
              resultContent = JSON.stringify({ error: 'Failed to parse tool arguments' });
              parseError = true;
            }

            if (!parseError) {
              const result = await tool.execute(params, {
                employeeId: request.employeeId,
                sessionId: request.sessionId,
              });
              resultContent = JSON.stringify(result.data ?? { error: result.error });
            }
          }

          // Add tool result to message history
          messages.push({
            role: 'tool',
            content: resultContent!,
            tool_call_id: toolCall.id,
          });

          yield { type: 'tool_use', toolName: toolCall.function.name, status: 'completed' };
        }

        // Re-query LLM with tool results
        response = await this.llm.chat(messages, { tools: toolDefinitions });
      }

      // Step 5: Emit final response
      // If tools were called, the final text answer is already in response.content
      // (generated via non-streaming call). Emit it as a single delta.
      // If no tools were called, use chatStream for true token-by-token streaming.
      if (iterations > 0) {
        // Tool call path: non-streaming answer already generated, emit it whole
        if (response.content) {
          yield { type: 'delta', content: response.content };
        }
      } else {
        // Pure RAG path: stream the response for best UX
        for await (const chunk of this.llm.chatStream(messages)) {
          yield { type: 'delta', content: chunk.delta };
        }
      }

      // Step 6: Emit source references
      const sources: SourceReference[] = context.map((c) => ({
        fileName: c.metadata.fileName,
        chunkIndex: c.metadata.chunkIndex,
        documentId: c.metadata.documentId,
        score: c.score,
      }));

      if (sources.length > 0) {
        yield { type: 'sources', sources };
      }

      yield { type: 'done' };

    } catch (error) {
      const appError = toAppError(error);
      log.error({ error: appError.code, sessionId: request.sessionId }, appError.message);
      yield { type: 'error', error: appError.message };
      yield { type: 'done' };
    }
  }
}
