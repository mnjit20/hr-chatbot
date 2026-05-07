export type ErrorCode =
  | 'DOCUMENT_PARSE_ERROR'
  | 'UNSUPPORTED_DOCUMENT_TYPE'
  | 'DOCUMENT_TOO_LARGE'
  | 'LLM_SERVICE_ERROR'
  | 'EMBEDDING_ERROR'
  | 'TOOL_EXECUTION_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly statusCode: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class DocumentParseError extends AppError {
  constructor(fileName: string, cause?: unknown) {
    super(`Failed to parse document: ${fileName}`, 'DOCUMENT_PARSE_ERROR', 422, cause);
    this.name = 'DocumentParseError';
  }
}

export class UnsupportedDocumentTypeError extends AppError {
  constructor(mimeType: string) {
    super(
      `Unsupported document type: ${mimeType}. Supported: PDF, TXT, Markdown`,
      'UNSUPPORTED_DOCUMENT_TYPE',
      415,
    );
    this.name = 'UnsupportedDocumentTypeError';
  }
}

export class LLMServiceError extends AppError {
  constructor(cause?: unknown) {
    super('LLM service error. Please try again.', 'LLM_SERVICE_ERROR', 503, cause);
    this.name = 'LLMServiceError';
  }
}

export class EmbeddingError extends AppError {
  constructor(cause?: unknown) {
    super('Failed to generate embeddings', 'EMBEDDING_ERROR', 503, cause);
    this.name = 'EmbeddingError';
  }
}

export class ToolExecutionError extends AppError {
  constructor(toolName: string, cause?: unknown) {
    super(`Tool execution failed: ${toolName}`, 'TOOL_EXECUTION_ERROR', 500, cause);
    this.name = 'ToolExecutionError';
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError(error.message, 'INTERNAL_ERROR', 500, error);
  }
  return new AppError('An unexpected error occurred', 'INTERNAL_ERROR', 500, error);
}
