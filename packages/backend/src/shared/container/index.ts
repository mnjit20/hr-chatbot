import type { AppConfig } from '../../config';
import { OpenAILLMService } from '../../infrastructure/llm/OpenAILLMService';
import { EmbeddingService } from '../../infrastructure/embeddings/OpenAIEmbeddingService';
import { InMemoryVectorStore } from '../../infrastructure/vectorStore/InMemoryVectorStore';
import { ParserRegistry } from '../../infrastructure/parsers/ParserRegistry';
import { PdfParser } from '../../infrastructure/parsers/PdfParser';
import { TxtParser } from '../../infrastructure/parsers/TxtParser';
import { MarkdownParser } from '../../infrastructure/parsers/MarkdownParser';
import { ToolRegistry } from '../../infrastructure/tools/ToolRegistry';
import { VacationDaysTool } from '../../infrastructure/tools/VacationDaysTool';
import { HRPolicyLookupTool } from '../../infrastructure/tools/HRPolicyLookupTool';
import { MockHRApiClient } from '../../infrastructure/tools/MockHRApiClient';
import { ChunkingService } from '../../application/ingestion/ChunkingService';
import { DocumentIngestionService } from '../../application/ingestion/DocumentIngestionService';
import { RetrievalService } from '../../application/retrieval/RetrievalService';
import { PromptBuilder } from '../../application/chat/PromptBuilder';
import { ChatOrchestrator } from '../../application/chat/ChatOrchestrator';
import { ChatController } from '../../api/controllers/ChatController';
import { DocumentsController } from '../../api/controllers/DocumentsController';

export interface AppContainer {
  chatController: ChatController;
  documentsController: DocumentsController;
}

/**
 * Manual dependency injection container.
 *
 * Why manual DI over InversifyJS/TSyringe?
 * - Zero magic: every dependency is explicit and type-checked
 * - No reflect-metadata or decorator configuration
 * - Fully readable: you can trace any dependency in 10 seconds
 * - Easy to swap implementations: change one line here, zero app code changes
 */
export function buildContainer(config: AppConfig): AppContainer {
  // ─── Infrastructure ────────────────────────────────────────────────────────
  const llmService = new OpenAILLMService({
    apiKey: config.openai.apiKey,
    model: config.openai.model,
    embeddingModel: config.openai.embeddingModel,
    baseURL: config.openai.baseURL,
  });

  const embeddingService = new EmbeddingService(llmService);
  const vectorStore = new InMemoryVectorStore();

  const parserRegistry = new ParserRegistry()
    .register('application/pdf', new PdfParser())
    .register('text/plain', new TxtParser())
    .register('text/markdown', new MarkdownParser());

  // HR API: swap MockHRApiClient → RealHRApiClient when ready
  const hrApiClient = new MockHRApiClient();

  const toolRegistry = new ToolRegistry([
    new VacationDaysTool(hrApiClient),
    new HRPolicyLookupTool(),
  ]);

  // ─── Application ───────────────────────────────────────────────────────────
  const chunkingService = new ChunkingService();
  const ingestionService = new DocumentIngestionService(
    parserRegistry,
    chunkingService,
    embeddingService,
    vectorStore,
  );

  const retrievalService = new RetrievalService(embeddingService, vectorStore);
  const promptBuilder = new PromptBuilder();

  const orchestrator = new ChatOrchestrator(
    llmService,
    retrievalService,
    toolRegistry,
    promptBuilder,
  );

  // ─── API ───────────────────────────────────────────────────────────────────
  const chatController = new ChatController(orchestrator);
  const documentsController = new DocumentsController(ingestionService);

  return { chatController, documentsController };
}
