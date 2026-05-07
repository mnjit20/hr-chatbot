import type { FastifyBaseLogger } from 'fastify';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';
type LogContext = Record<string, unknown>;

class Logger {
  private readonly prefix: string;

  constructor(prefix = 'app') {
    this.prefix = prefix;
  }

  child(bindings: Record<string, string>): Logger {
    return new Logger(`${this.prefix}:${bindings['module'] ?? 'child'}`);
  }

  info(context: LogContext | string, message?: string): void {
    this.log('info', context, message);
  }

  warn(context: LogContext | string, message?: string): void {
    this.log('warn', context, message);
  }

  error(context: LogContext | string, message?: string): void {
    this.log('error', context, message);
  }

  debug(context: LogContext | string, message?: string): void {
    if (process.env['NODE_ENV'] === 'development') {
      this.log('debug', context, message);
    }
  }

  private log(level: LogLevel, context: LogContext | string, message?: string): void {
    const ts = new Date().toISOString();
    const msg = typeof context === 'string' ? context : (message ?? '');
    const ctx = typeof context === 'object' ? context : {};

    const entry = JSON.stringify({ ts, level, prefix: this.prefix, msg, ...ctx });

    if (level === 'error' || level === 'warn') {
      console.error(entry);
    } else {
      console.log(entry);
    }
  }
}

export const logger = new Logger();

export function createFastifyLogger(): Pick<FastifyBaseLogger, 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal' | 'child'> {
  const log = new Logger('fastify');
  return {
    info: (obj: unknown, msg?: string) => log.info(obj as LogContext, msg),
    warn: (obj: unknown, msg?: string) => log.warn(obj as LogContext, msg),
    error: (obj: unknown, msg?: string) => log.error(obj as LogContext, msg),
    debug: (obj: unknown, msg?: string) => log.debug(obj as LogContext, msg),
    trace: () => undefined,
    fatal: (obj: unknown, msg?: string) => log.error(obj as LogContext, msg),
    child: (bindings: Record<string, string>) => log.child(bindings) as unknown as FastifyBaseLogger,
  };
}
