import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useChat } from './useChat';
import * as chatService from '../services/chatService';

vi.mock('../services/chatService');

async function* mockStream(events: Array<{ type: string; [k: string]: unknown }>) {
  for (const event of events) {
    yield event;
  }
}

describe('useChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset zustand store between tests
    const { useChatStore } = require('../store/chatStore') as { useChatStore: { getState(): { clearMessages(): void } } };
    useChatStore.getState().clearMessages();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds user and assistant messages on sendMessage', async () => {
    vi.mocked(chatService.streamChat).mockImplementation(async function* () {
      yield { type: 'delta', content: 'Hello!' };
      yield { type: 'done' };
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage('Hi there');
      // Allow microtasks to flush
      await new Promise((r) => setTimeout(r, 50));
    });

    const messages = result.current.messages;
    expect(messages.some((m) => m.role === 'user' && m.content === 'Hi there')).toBe(true);
    expect(messages.some((m) => m.role === 'assistant')).toBe(true);
  });

  it('builds assistant content from delta events', async () => {
    vi.mocked(chatService.streamChat).mockImplementation(async function* () {
      yield { type: 'delta', content: 'You have ' };
      yield { type: 'delta', content: '12 days left.' };
      yield { type: 'done' };
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage('Vacation balance?');
      await new Promise((r) => setTimeout(r, 50));
    });

    const assistant = result.current.messages.find((m) => m.role === 'assistant');
    expect(assistant?.content).toBe('You have 12 days left.');
    expect(assistant?.isStreaming).toBe(false);
  });

  it('attaches sources from sources event', async () => {
    const sources = [{ fileName: 'policy.txt', chunkIndex: 0, documentId: 'd1', score: 0.9 }];
    vi.mocked(chatService.streamChat).mockImplementation(async function* () {
      yield { type: 'delta', content: 'Policy info.' };
      yield { type: 'sources', sources };
      yield { type: 'done' };
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage('What is the vacation policy?');
      await new Promise((r) => setTimeout(r, 50));
    });

    const assistant = result.current.messages.find((m) => m.role === 'assistant');
    expect(assistant?.sources).toEqual(sources);
  });

  it('sets error state on error event', async () => {
    vi.mocked(chatService.streamChat).mockImplementation(async function* () {
      yield { type: 'error', error: 'LLM service unavailable' };
      yield { type: 'done' };
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage('Hello');
      await new Promise((r) => setTimeout(r, 50));
    });

    const assistant = result.current.messages.find((m) => m.role === 'assistant');
    expect(assistant?.error).toBe(true);
    expect(assistant?.isStreaming).toBe(false);
  });

  it('clearMessages empties the message list', async () => {
    vi.mocked(chatService.streamChat).mockImplementation(async function* () {
      yield { type: 'done' };
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage('Test');
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.messages.length).toBeGreaterThan(0);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });
});
