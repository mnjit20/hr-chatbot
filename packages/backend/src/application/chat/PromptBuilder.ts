import type { LLMMessage } from '../../domain/llm/LLMMessage';
import type { ChatRequest, ChatHistoryMessage } from '../../domain/chat/ChatMessage';
import type { ScoredChunk } from '../../domain/document/DocumentChunk';
import { MAX_HISTORY_TURNS } from '../../config/constants';

/**
 * Responsible for constructing the full message array sent to the LLM.
 *
 * Design: prompts are business logic — they evolve frequently for compliance,
 * tone, A/B testing. Isolating them here makes them testable and versionable
 * without touching the orchestrator.
 */
export class PromptBuilder {
  buildMessages(request: ChatRequest, context: ScoredChunk[]): LLMMessage[] {
    const systemPrompt = this.buildSystemPrompt(context);

    // Sliding window: keep most recent N turns to bound context size and cost
    const recentHistory = request.history.slice(-(MAX_HISTORY_TURNS * 2));

    return [
      { role: 'system', content: systemPrompt },
      ...recentHistory.map(this.toMessage),
      { role: 'user', content: request.message },
    ];
  }

  private buildSystemPrompt(context: ScoredChunk[]): string {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const contextSection = context.length > 0
      ? this.buildContextSection(context)
      : '(No document context retrieved — answer from general knowledge or use tools.)';

    return `You are an HR assistant for JohnDoe GmbH. You help employees with HR-related questions professionally and concisely.

Today's date: ${today}

## Document Context
${contextSection}

## Instructions
- When document context is provided, base your answers on it and cite sources using [SOURCE N] notation
- If context is insufficient or the question requires real-time data, use the available tools
- For vacation balance, remaining days, or PTO questions — always use the get_vacation_balance tool
- Be concise, accurate, and professional
- If you're uncertain, say so — never fabricate HR policies or numbers
- Do not reveal the internal structure of sources or chunk indices to the user`;
  }

  private buildContextSection(context: ScoredChunk[]): string {
    return context
      .map(
        (chunk, i) =>
          `[SOURCE ${i + 1} | ${chunk.metadata.fileName} | relevance: ${(chunk.score * 100).toFixed(0)}%]\n${chunk.text}`,
      )
      .join('\n\n---\n\n');
  }

  private toMessage(msg: ChatHistoryMessage): LLMMessage {
    return { role: msg.role, content: msg.content };
  }
}
