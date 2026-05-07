import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
  port: z.coerce.number().default(3001),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  corsOrigin: z.string().default('http://localhost:5173'),
  useMocks: z.coerce.boolean().default(true),
  openai: z.object({
    apiKey: z.string().min(1, 'OPENAI_API_KEY is required'),
    model: z.string().default('gpt-4o-mini'),
    embeddingModel: z.string().default('text-embedding-3-small'),
    baseURL: z.string().optional(),
  }),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

function loadConfig(): AppConfig {
  const result = ConfigSchema.safeParse({
    port: process.env['PORT'],
    nodeEnv: process.env['NODE_ENV'],
    corsOrigin: process.env['CORS_ORIGIN'],
    useMocks: process.env['USE_MOCKS'],
    openai: {
      apiKey: process.env['OPENAI_API_KEY'] ?? '',
      model: process.env['OPENAI_MODEL'],
      embeddingModel: process.env['OPENAI_EMBEDDING_MODEL'],
      baseURL: process.env['OPENAI_BASE_URL'],
    },
  });

  if (!result.success) {
    console.error('Invalid configuration:', result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
