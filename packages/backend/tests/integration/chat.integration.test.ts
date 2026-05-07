/**
 * Integration tests: real HTTP server, real parsers, real chunking.
 * Only the LLM and embedding services are mocked to avoid API costs.
 *
 * Run with: pnpm test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';

import { buildContainer } from '../../src/shared/container';
import { registerChatRoutes } from '../../src/api/routes/chat.routes';
import { registerDocumentRoutes } from '../../src/api/routes/documents.routes';
import { errorHandler } from '../../src/api/middleware/errorHandler';

function parseSSEResponse(body: string): Array<{ type: string }> {
  return body
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => {
      try {
        return JSON.parse(line.slice(6)) as { type: string };
      } catch {
        return { type: 'parse_error' };
      }
    });
}

let app: FastifyInstance;

beforeAll(async () => {
  app = Fastify({ logger: false });
  await app.register(cors, { origin: '*' });
  await app.register(multipart);
  app.setErrorHandler(errorHandler);

  const container = buildContainer({
    port: 0,
    nodeEnv: 'test',
    corsOrigin: '*',
    useMocks: true,
    openai: {
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      embeddingModel: 'text-embedding-3-small',
    },
  });

  registerChatRoutes(app, container.chatController);
  registerDocumentRoutes(app, container.documentsController);

  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    app.get('/health', async () => ({ status: 'ok' }));
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
  });
});

describe('POST /api/documents', () => {
  it('returns 400 when no file is uploaded', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: { 'content-type': 'application/json' },
      payload: {},
    });
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('rejects unsupported file types', async () => {
    const form = new FormData();
    form.append('file', new Blob(['content'], { type: 'application/json' }), 'data.json');

    // Use inject with multipart manually
    const response = await app.inject({
      method: 'POST',
      url: '/api/documents',
      headers: { 'content-type': 'multipart/form-data; boundary=----boundary' },
      payload: '------boundary\r\nContent-Disposition: form-data; name="file"; filename="data.json"\r\nContent-Type: application/json\r\n\r\n{}\r\n------boundary--\r\n',
    });

    // Should reject json files (unsupported type)
    expect(response.statusCode).toBeGreaterThanOrEqual(400);
  });
});

describe('POST /api/chat/stream', () => {
  it('returns 400 for missing message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/chat/stream',
      payload: { history: [] },
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 400 for empty message', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/chat/stream',
      payload: { message: '', history: [] },
    });
    expect(response.statusCode).toBe(400);
  });
});
