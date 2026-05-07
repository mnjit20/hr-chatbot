import type { ChatStreamEvent } from '../types';

interface ChatPayload {
  message: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId: string;
  employeeId?: string;
}

/**
 * Sends a chat request and returns an async iterable of SSE events.
 *
 * We use fetch + ReadableStream over EventSource because:
 * - EventSource only supports GET (can't send JSON body)
 * - fetch gives us full control over headers and abort
 */
export async function* streamChat(
  payload: ChatPayload,
  signal: AbortSignal,
): AsyncIterable<ChatStreamEvent> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  console.log("🚀aaaaa ~ streamChat ~ response:", response)

  if (!response.ok) {
    const errorBody = await response.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${response.status}: ${errorBody}`);
  }

  if (!response.body) throw new Error('No response body');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      // Keep the last (potentially incomplete) line in buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const event = JSON.parse(data) as ChatStreamEvent;
            yield event;

            if (event.type === 'done') return;
          } catch {
            // Malformed SSE line — skip
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
