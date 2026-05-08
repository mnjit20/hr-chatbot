# HR Chatbot

A production-quality HR assistant chatbot that answers questions from static documents (PDF, TXT, Markdown) and fetches real-time employee data via tool calling.

Built as a demonstration of senior-level AI engineering architecture.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React + Vite Frontend                                        │
│  SSE streaming · Source citations · Document upload          │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTP / SSE
┌───────────────────────────▼──────────────────────────────────┐
│  Fastify Backend                                              │
│                                                               │
│  Chat Orchestrator                                            │
│    ├─ RAG: embed query → vector search → inject context      │
│    ├─ Tool loop: OpenAI function calling → execute → repeat  │
│    └─ Stream final response via SSE                          │
│                                                               │
│  Infrastructure (all behind interfaces — swappable)           │
│    ├─ InMemoryVectorStore  →  Pinecone / pgvector             │
│    ├─ OpenAILLMService     →  Azure / Anthropic / Groq        │
│    ├─ PDF / TXT / MD parsers                                  │
│    └─ MockHRApiClient      →  Real HRIS                       │
└──────────────────────────────────────────────────────────────┘
```

**Key design decisions:**
- Domain interfaces with zero dependencies enable total swap-out of infra
- Manual DI container — transparent, type-checked, no decorator magic
- No LangChain — OpenAI function calling is already the right abstraction
- SSE over WebSockets — unidirectional streaming is all we need
- Zod for all validation at system boundaries
- Per-route rate limiting — tighter caps on expensive LLM/embedding endpoints

---

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 8+
- OpenAI API key

### Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example packages/backend/.env
# Set OPENAI_API_KEY in packages/backend/.env
```

### Development

```bash
# Run both frontend and backend concurrently
pnpm dev

# Backend only (http://localhost:3001)
pnpm --filter backend dev

# Frontend only (http://localhost:5173)
pnpm --filter frontend dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Usage

### 1. Upload Documents

Upload HR documents via the sidebar (drag & drop or click). Supported formats:
- **PDF** — employee handbooks, policy documents
- **TXT** — plain text policies
- **Markdown** — formatted HR guides

Sample documents are in `./docs/`.

### 2. Chat

Ask natural language questions:

| Question type | Example |
|---|---|
| Document-based | "What is the remote work policy?" |
| Document-based | "How does the performance review process work?" |
| Real-time data | "How many vacation days do I have left?" |
| Hybrid | "Am I eligible for a merit increase this year?" |

### 3. Streaming

Responses stream token-by-token. Source documents are cited at the end of each answer. Tool usage (API calls) is shown inline.

---

## API Reference

### `POST /api/chat/stream`

Streams a chat response as Server-Sent Events.

**Request:**
```json
{
  "message": "How many vacation days do I have?",
  "history": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I help?" }
  ],
  "sessionId": "optional-uuid",
  "employeeId": "EMP001"
}
```

**SSE Stream:**
```
data: {"type":"tool_use","toolName":"get_vacation_balance","status":"started"}
data: {"type":"tool_use","toolName":"get_vacation_balance","status":"completed"}
data: {"type":"delta","content":"You have "}
data: {"type":"delta","content":"12 remaining vacation days"}
data: {"type":"delta","content":" out of 20 for 2024."}
data: {"type":"sources","sources":[{"fileName":"vacation-policy.txt","score":0.87}]}
data: {"type":"done"}
```

### `POST /api/documents`

Upload a document for ingestion (multipart/form-data).

**Response:**
```json
{
  "documentId": "3f7a9b12-...",
  "fileName": "employee-handbook.pdf",
  "chunksCreated": 42,
  "status": "ingested"
}
```

### `DELETE /api/documents/:documentId`

Remove a document and its vector embeddings.

### `GET /health`

Health check — returns `{ status, timestamp, env }`. Not rate-limited.

---

## Rate Limiting

All endpoints are protected by `@fastify/rate-limit`. Limits are defined centrally in `src/config/constants.ts` (`RATE_LIMIT`) and applied per-route.

| Endpoint | Limit | Reason |
|---|---|---|
| `POST /api/chat/stream` | **20 req / min** | Each request triggers an LLM completion + embedding call |
| `POST /api/documents` | **10 req / min** | Triggers document parsing + batch embedding (most expensive) |
| `DELETE /api/documents/:id` | **30 req / min** | Cheap, but prevents accidental bulk deletes |
| All other routes | **100 req / min** | Global fallback |

### Response headers

Every response includes standard rate-limit headers so clients can back off gracefully:

```
x-ratelimit-limit: 20
x-ratelimit-remaining: 19
x-ratelimit-reset: 1717200060
retry-after: 45
```

### 429 error envelope

When a limit is exceeded the server returns `HTTP 429` with a consistent error shape:

```json
{
  "error": "Too many requests — please slow down. Try again in 45 seconds.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": "45 seconds"
}
```

### Scaling to multiple instances

The default store is in-memory (per-process). To share limits across multiple backend instances, pass a Redis client to the plugin in `src/index.ts`:

```typescript
import Redis from 'ioredis';

await fastify.register(rateLimit, {
  // ...existing options...
  redis: new Redis(process.env.REDIS_URL),
});
```

No other code changes required.

---

## Testing

```bash
# Run all unit tests
pnpm test

# Watch mode
pnpm --filter backend test:watch
pnpm --filter frontend test:watch

# Integration tests (backend)
pnpm test:integration

# Coverage report
pnpm --filter backend test:coverage
```

**Test coverage targets:**
- Domain + application layers: >90%
- Infrastructure adapters: >80%
- Frontend hooks + components: >70%

---

## Project Structure

```
hr-chatbot/
├── packages/
│   ├── backend/src/
│   │   ├── domain/          # Pure interfaces — zero dependencies
│   │   ├── application/     # Use cases: orchestration, ingestion, retrieval
│   │   ├── infrastructure/  # LLM, vector store, parsers, tools
│   │   ├── api/             # Fastify routes, controllers, schemas
│   │   └── shared/          # DI container, errors, logger
│   └── frontend/src/
│       ├── components/      # Chat UI, document upload, UI primitives
│       ├── hooks/           # useChat (SSE), useDocumentUpload
│       ├── services/        # API client functions
│       ├── store/           # Zustand state
│       └── types/           # Shared TypeScript types
└── docs/                    # Sample HR documents for demo
```

---

## Adding a New Tool

1. Implement `ITool` in `packages/backend/src/infrastructure/tools/`
2. Register it in `packages/backend/src/shared/container/index.ts`
3. That's it — the orchestrator picks it up automatically

```typescript
// Example: new tool in 15 lines
export class PTORequestTool implements ITool {
  readonly name = 'submit_pto_request';
  readonly description = 'Submit a PTO request for an employee...';
  async execute(params, context) { /* ... */ }
  toDefinition() { return { type: 'function', function: { name: this.name, ... } }; }
}
```

---

## Adding a New Document Parser

```typescript
// 1. Implement IDocumentParser
export class DocxParser implements IDocumentParser {
  async parse(buffer, metadata) { /* mammoth.js or similar */ }
}

// 2. Register in container/index.ts
parserRegistry.register('application/vnd.openxmlformats-officedocument.wordprocessingml.document', new DocxParser());
```

---

## Scaling to Production

| Current | Production path |
|---|---|
| `InMemoryVectorStore` | Pinecone / pgvector / Qdrant |
| Single process | Background queue (BullMQ) for ingestion |
| Stateless chat | Redis for conversation history |
| `MockHRApiClient` | Real HRIS (Workday / BambooHR) with OAuth |
| No auth | JWT middleware + employee ID from token |
| Console logging | Pino → Datadog / Grafana Loki |
| In-process rate limit store | Redis — share limits across multiple instances |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | **Required.** Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o-mini` | Chat completion model |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Embedding model |
| `OPENAI_BASE_URL` | — | Override for Azure / local models |
| `PORT` | `3001` | Backend server port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `USE_MOCKS` | `true` | Use mock HR API client |
| `NODE_ENV` | `development` | Environment |

---

## Tech Stack

**Backend:** Fastify · @fastify/rate-limit · TypeScript · OpenAI SDK · pdf-parse · Zod · Vitest

**Frontend:** React 18 · Vite · Zustand · react-markdown · Vitest · Testing Library

**Monorepo:** pnpm workspaces

---

*Built with clean architecture principles: domain interfaces, dependency injection, ports & adapters pattern.*
