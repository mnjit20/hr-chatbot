import ReactMarkdown from 'react-markdown';
import { SourceCitations } from './SourceCitations';
import { TypingIndicator } from './TypingIndicator';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isEmpty = message.content.trim() === '' && message.isStreaming;

  return (
    <div
      className={`message message--${isUser ? 'user' : 'assistant'} ${message.error ? 'message--error' : ''}`}
      data-testid={`message-${message.role}`}
    >
      <div className="message__avatar">
        {isUser ? '👤' : '🤖'}
      </div>

      <div className="message__body">
        <div className="message__bubble">
          {isEmpty ? (
            <TypingIndicator />
          ) : isUser ? (
            <p className="message__text">{message.content}</p>
          ) : (
            <div className="message__markdown">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="message__tools" aria-label="Tools used">
            {message.toolsUsed.map((tool) => (
              <span key={tool} className="message__tool-badge">
                🔧 {tool.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <SourceCitations sources={message.sources} />
        )}

        <time className="message__time" dateTime={message.timestamp.toISOString()}>
          {formatTime(message.timestamp)}
        </time>
      </div>
    </div>
  );
}
