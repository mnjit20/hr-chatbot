import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { MessageBubble } from './MessageBubble';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { useChat } from '../../hooks/useChat';

const SUGGESTED_QUESTIONS = [
  'How many vacation days do I have left?',
  'What is the remote work policy?',
  'How does the performance review process work?',
  'What are the maternity leave benefits?',
];

export function ChatWindow() {
  const { messages, isStreaming, sendMessage, stopStreaming, clearMessages } = useChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    sendMessage(text);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = (q: string) => {
    if (isStreaming) return;
    sendMessage(q);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="chat-window">
      {/* Header */}
      <div className="chat-window__header">
        <div className="chat-window__title">
          <span className="chat-window__icon">🤖</span>
          <div>
            <h1 className="chat-window__name">HR Assistant</h1>
            <p className="chat-window__subtitle">Powered by AI · John Doe GmbH</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearMessages} title="Clear conversation">
            Clear
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="chat-window__messages" role="log" aria-live="polite" aria-label="Chat messages">
        {isEmpty ? (
          <div className="chat-window__empty">
            <p className="chat-window__empty-title">How can I help you today?</p>
            <p className="chat-window__empty-subtitle">
              Ask me about HR policies, benefits, or your personal HR data.
            </p>
            <div className="suggestions">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  className="suggestions__item"
                  onClick={() => handleSuggestion(q)}
                  type="button"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="chat-window__input-area">
        <div className="chat-window__input-row">
          <textarea
            ref={inputRef}
            className="chat-window__textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about HR policies, vacation days, benefits..."
            rows={1}
            disabled={isStreaming}
            aria-label="Chat input"
            aria-multiline="true"
          />

          {isStreaming ? (
            <Button variant="danger" size="sm" onClick={stopStreaming} title="Stop generating">
              ■ Stop
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleSend}
              disabled={!input.trim()}
              title="Send message (Enter)"
            >
              Send
            </Button>
          )}
        </div>
        <p className="chat-window__hint">
          Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
