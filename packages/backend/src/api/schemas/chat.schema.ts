import { z } from 'zod';

export const ChatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export const ChatRequestBodySchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(4000, 'Message too long'),
  history: z.array(ChatHistoryMessageSchema).default([]),
  sessionId: z.string().optional(),
  employeeId: z.string().optional(),
});

export type ChatRequestBody = z.infer<typeof ChatRequestBodySchema>;
