import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';

import type { ChatOptions, ChatResponse, ILLMService, StreamChunk } from '../../domain/llm/ILLMService';
import type { LLMMessage } from '../../domain/llm/LLMMessage';
import { LLMServiceError, EmbeddingError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger';

const log = logger.child({ module: 'OpenAILLMService' });

export interface OpenAIConfig {
  apiKey: string;
  model: string;
  embeddingModel: string;
  baseURL?: string;
}
export class OpenAILLMService implements ILLMService {
  private readonly client: OpenAI;

  constructor(private readonly config: OpenAIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      // baseURL enables drop-in replacement with Azure OpenAI, Together, Groq, Ollama, etc.
      ...(config.baseURL ? { baseURL: config.baseURL } : {}),
    });
  }

  async chat(messages: LLMMessage[], options?: ChatOptions): Promise<ChatResponse> {
    try {
      log.debug({ messageCount: messages.length }, 'Sending chat request');

      const response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages as ChatCompletionMessageParam[],
        tools: options?.tools as ChatCompletionTool[] | undefined,
        tool_choice: options?.tools ? 'auto' : undefined,
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens,
      });

      const choice = response.choices[0];
      if (!choice) throw new LLMServiceError('No completion choice returned');

      return {
        content: choice.message.content,
        toolCalls: choice.message.tool_calls?.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      };
    } catch (error) {
      if (error instanceof LLMServiceError) throw error;
      log.error({ error }, 'LLM chat request failed');
      throw new LLMServiceError(error);
    }
  }

  async *chatStream(messages: LLMMessage[], options?: ChatOptions): AsyncIterable<StreamChunk> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.config.model,
        messages: messages as ChatCompletionMessageParam[],
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          yield { delta };
        }
      }
    } catch (error) {
      log.error({ error }, 'LLM stream request failed');
      throw new LLMServiceError(error);
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.config.embeddingModel,
        input: text.slice(0, 8000), // guard against token limit
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) throw new EmbeddingError('No embedding returned');
      return embedding;
    } catch (error) {
      if (error instanceof EmbeddingError) throw error;
      log.error({ error }, 'Embedding request failed');
      throw new EmbeddingError(error);
    }
  }
}
