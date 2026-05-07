import { z } from 'zod';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const MIME_TYPE_MAP: Record<string, string> = {
  'application/pdf': 'application/pdf',
  'text/plain': 'text/plain',
  'text/markdown': 'text/markdown',
};

export const IngestionResponseSchema = z.object({
  documentId: z.string(),
  fileName: z.string(),
  chunksCreated: z.number(),
  status: z.literal('ingested'),
});

export type IngestionResponse = z.infer<typeof IngestionResponseSchema>;
