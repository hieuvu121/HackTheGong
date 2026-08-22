import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { seedIfEmpty } from './seed';
import { AiService } from './ai/ai.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // The phone and the web build are both separate origins in development.
  app.enableCors({ origin: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await seedIfEmpty(app.get(DataSource));

  const port = config.get<number>('port')!;
  await app.listen(port, '0.0.0.0');

  const log = new Logger('Bootstrap');
  log.log(`CycleSafe API listening on http://localhost:${port}`);
  log.log(
    app.get(AiService).enabled
      ? 'Photo analysis: OpenAI'
      : 'Photo analysis: fallback only (set OPENAI_API_KEY to enable)',
  );
}

void bootstrap();
