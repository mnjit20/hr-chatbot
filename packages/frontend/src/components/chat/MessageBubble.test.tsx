import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../../types';

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: '1',
    role: 'assistant',
    content: 'Hello, how can I help?',
    timestamp: new Date('2024-01-01T10:00:00'),
    ...overrides,
  };
}

describe('MessageBubble', () => {
  it('renders assistant message content', () => {
    render(<MessageBubble message={makeMessage({ content: 'You have 15 vacation days.' })} />);
    expect(screen.getByText('You have 15 vacation days.')).toBeInTheDocument();
  });

  it('renders user message content', () => {
    render(<MessageBubble message={makeMessage({ role: 'user', content: 'How many days do I have?' })} />);
    expect(screen.getByText('How many days do I have?')).toBeInTheDocument();
  });

  it('shows typing indicator when streaming with empty content', () => {
    render(
      <MessageBubble message={makeMessage({ content: '', isStreaming: true })} />,
    );
    expect(screen.getByLabelText('Assistant is typing')).toBeInTheDocument();
  });

  it('shows tool badges when tools were used', () => {
    render(
      <MessageBubble
        message={makeMessage({ toolsUsed: ['get_vacation_balance'] })}
      />,
    );
    expect(screen.getByText(/get vacation balance/i)).toBeInTheDocument();
  });

  it('renders sources when provided', () => {
    const sources = [
      { fileName: 'policy.txt', chunkIndex: 0, documentId: 'doc1', score: 0.92 },
    ];
    render(<MessageBubble message={makeMessage({ sources })} />);
    expect(screen.getByText('policy.txt')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('applies error styling for error messages', () => {
    const { container } = render(
      <MessageBubble message={makeMessage({ error: true, content: 'Something went wrong.' })} />,
    );
    expect(container.firstChild).toHaveClass('message--error');
  });

  it('has correct test id for role', () => {
    render(<MessageBubble message={makeMessage({ role: 'user' })} />);
    expect(screen.getByTestId('message-user')).toBeInTheDocument();
  });
});
