import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatOrchestrator } from './ChatOrchestrator';
import { PromptBuilder } from './PromptBuilder';
import { ToolRegistry } from '../../infrastructure/tools/ToolRegistry';
import { HRPolicyLookupTool } from '../../infrastructure/tools/HRPolicyLookupTool';
import type { ILLMService, ChatResponse } from '../../domain/llm/ILLMService';
import type { RetrievalService } from '../retrieval/RetrievalService';
import type { ChatRequest } from '../../domain/chat/ChatMessage';
import type { ScoredChunk } from '../../domain/document/DocumentChunk';

function makeChunk(text = 'Vacation policy: 20 days per year.'): ScoredChunk {
  return {
    id: 'c1',
    text,
    metadata: { documentId: 'd1', fileName: 'policy.txt', chunkIndex: 0 },
    embedding: [],
    score: 0.9,
  };
}

function makeLLMService(response: Partial<ChatResponse> = {}): ILLMService {
  const chunks = response.content ? [{ delta: response.content }] : [];
  return {
    chat: vi.fn().mockResolvedValue({ content: 'Default answer.', toolCalls: undefined, ...response }),
    chatStream: vi.fn().mockImplementation(async function* () {
      for (const chunk of chunks) yield chunk;
    }),
    embed: vi.fn().mockResolvedValue([0.1]),
  };
}

function makeRetrievalService(chunks: ScoredChunk[] = []): RetrievalService {
  return { retrieve: vi.fn().mockResolvedValue(chunks) } as unknown as RetrievalService;
}

const baseRequest: ChatRequest = {
  message: 'How many vacation days do I have?',
  history: [],
  sessionId: 'test-session',
  employeeId: 'EMP001',
};

describe('ChatOrchestrator', () => {
  let orchestrator: ChatOrchestrator;
  let llm: ILLMService;
  let retrieval: RetrievalService;

  beforeEach(() => {
    llm = makeLLMService({ content: 'You have 20 vacation days.' });
    retrieval = makeRetrievalService([makeChunk()]);
    orchestrator = new ChatOrchestrator(llm, retrieval, new ToolRegistry(), new PromptBuilder());
  });

  async function collectEvents(req: ChatRequest) {
    const events = [];
    for await (const event of orchestrator.chat(req)) {
      events.push(event);
    }
    return events;
  }

  it('calls retrieval with user message', async () => {
    await collectEvents(baseRequest);
    expect(retrieval.retrieve).toHaveBeenCalledWith('How many vacation days do I have?');
  });

  it('calls LLM chat with messages containing document context', async () => {
    await collectEvents(baseRequest);
    const messages = (llm.chat as ReturnType<typeof vi.fn>).mock.calls[0][0] as Array<{ role: string; content: string }>;
    const systemMsg = messages.find((m) => m.role === 'system');
    expect(systemMsg?.content).toContain('policy.txt');
  });

  it('streams delta events from final LLM response', async () => {
    const events = await collectEvents(baseRequest);
    const deltas = events.filter((e) => e.type === 'delta');
    const fullText = deltas.map((e) => ('content' in e ? e.content : '')).join('');
    expect(fullText).toBe('You have 20 vacation days.');
  });

  it('emits sources event when context is found', async () => {
    const events = await collectEvents(baseRequest);
    const sourcesEvent = events.find((e) => e.type === 'sources');
    expect(sourcesEvent).toBeDefined();
    if (sourcesEvent && sourcesEvent.type === 'sources') {
      expect(sourcesEvent.sources[0]?.fileName).toBe('policy.txt');
    }
  });

  it('emits done event at the end', async () => {
    const events = await collectEvents(baseRequest);
    expect(events[events.length - 1]?.type).toBe('done');
  });

  it('executes tool call and feeds result back to LLM', async () => {
    const toolCallLLM = makeLLMService();
    (toolCallLLM.chat as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        content: null,
        toolCalls: [{
          id: 'call_1',
          type: 'function',
          function: { name: 'get_hr_policy', arguments: '{"topic":"sick_leave"}' },
        }],
      })
      .mockResolvedValueOnce({ content: 'Sick leave policy: unlimited days.', toolCalls: undefined });

    const toolOrchestrator = new ChatOrchestrator(
      toolCallLLM,
      retrieval,
      new ToolRegistry([new HRPolicyLookupTool()]),
      new PromptBuilder(),
    );

    const events = await (async () => {
      const evts = [];
      for await (const e of toolOrchestrator.chat(baseRequest)) evts.push(e);
      return evts;
    })();

    const toolEvents = events.filter((e) => e.type === 'tool_use');
    expect(toolEvents.length).toBeGreaterThan(0);
    // LLM chat called twice: once with tool call response, once final
    expect(toolCallLLM.chat).toHaveBeenCalledTimes(2);
  });

  it('emits error event when LLM throws', async () => {
    (llm.chat as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('LLM timeout'));
    const events = await collectEvents(baseRequest);
    const errorEvent = events.find((e) => e.type === 'error');
    expect(errorEvent).toBeDefined();
  });

  it('caps tool iterations at MAX_TOOL_ITERATIONS', async () => {
    // Always return a tool call — orchestrator must break out of loop
    (llm.chat as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: null,
      toolCalls: [{
        id: 'call_1',
        type: 'function',
        function: { name: 'get_hr_policy', arguments: '{"topic":"sick_leave"}' },
      }],
    });

    const toolOrchestrator = new ChatOrchestrator(
      llm,
      retrieval,
      new ToolRegistry([new HRPolicyLookupTool()]),
      new PromptBuilder(),
    );

    const events = await (async () => {
      const evts = [];
      for await (const e of toolOrchestrator.chat(baseRequest)) evts.push(e);
      return evts;
    })();

    // Should not loop forever — done event must be present
    expect(events.some((e) => e.type === 'done')).toBe(true);
    // LLM called at most MAX_TOOL_ITERATIONS + 1 times
    expect((llm.chat as ReturnType<typeof vi.fn>).mock.calls.length).toBeLessThanOrEqual(6);
  });
});
