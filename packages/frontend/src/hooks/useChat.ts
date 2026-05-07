import { useCallback, useRef } from 'react';
import { useChatStore } from '../store/chatStore';
import { streamChat } from '../services/chatService';
import type { Message } from '../types';

function makeId(): string {
  return crypto.randomUUID();
}

function messagesToHistory(messages: Message[]) {
  return messages
    .filter((m) => !m.isStreaming && !m.error)
    .map((m) => ({ role: m.role, content: m.content }));
}

export interface UseChatReturn {
  messages: Message[];
  isStreaming: boolean;
  sendMessage: (text: string) => void;
  stopStreaming: () => void;
  clearMessages: () => void;
}

export function useChat(): UseChatReturn {
  const { messages, sessionId, employeeId, addMessage, updateMessage, appendDelta, clearMessages } =
    useChatStore();

  const abortRef = useRef<AbortController | null>(null);
  const isStreamingRef = useRef(false);

  // Derive isStreaming from messages (avoids extra state)
  const isStreaming = messages.some((m) => m.isStreaming);

  const sendMessage = useCallback(
    (text: string) => {
      if (isStreamingRef.current) return;

      // Cancel any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      isStreamingRef.current = true;

      const userMessage: Message = {
        id: makeId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      const assistantId = makeId();
      const assistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        toolsUsed: [],
        timestamp: new Date(),
      };

      addMessage(userMessage);
      addMessage(assistantMessage);

      // Run async stream in fire-and-forget, updating store as events arrive
      void (async () => {
        try {
          const history = messagesToHistory(messages);
          const stream = streamChat(
            { message: text, history, sessionId, employeeId },
            abortRef.current!.signal,
          );

          for await (const event of stream) {
            switch (event.type) {
              case 'delta':
                appendDelta(assistantId, event.content);
                break;

              case 'tool_use':
                if (event.status === 'completed') {
                  updateMessage(assistantId, {
                    toolsUsed: [
                      ...(messages.find((m) => m.id === assistantId)?.toolsUsed ?? []),
                      event.toolName,
                    ],
                  });
                }
                break;

              case 'sources':
                updateMessage(assistantId, { sources: event.sources });
                break;

              case 'error':
                updateMessage(assistantId, {
                  content: event.error || 'An error occurred.',
                  error: true,
                  isStreaming: false,
                });
                return;

              case 'done':
                updateMessage(assistantId, { isStreaming: false });
                return;
            }
          }
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') {
            updateMessage(assistantId, { isStreaming: false });
            return;
          }
          updateMessage(assistantId, {
            content: 'Failed to get a response. Please try again.',
            error: true,
            isStreaming: false,
          });
        } finally {
          isStreamingRef.current = false;
        }
      })();
    },
    [messages, sessionId, employeeId, addMessage, updateMessage, appendDelta],
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { messages, isStreaming, sendMessage, stopStreaming, clearMessages };
}
