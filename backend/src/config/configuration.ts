import { resolve } from 'node:path';

export interface AppConfig {
  port: number;
  dataDir: string;
  uploadDir: string;
  openaiApiKey: string | null;
  openaiModel: string;
}

export default (): AppConfig => ({
  port: Number(process.env.PORT ?? 3000),
  dataDir: resolve(process.cwd(), process.env.DATA_DIR ?? './data'),
  uploadDir: resolve(process.cwd(), process.env.UPLOAD_DIR ?? './uploads'),
  // Absent is a supported state, not an error: the AI service falls back to a
  // labelled heuristic so the app stays demoable without a key.
  openaiApiKey: process.env.OPENAI_API_KEY?.trim() || null,
  openaiModel: process.env.OPENAI_MODEL?.trim() || 'gpt-5.6',
});
