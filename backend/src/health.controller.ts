import { Controller, Get } from '@nestjs/common';
import { AiService } from './ai/ai.service';

@Controller('api/health')
export class HealthController {
  constructor(private readonly ai: AiService) {}

  /**
   * Tells the app whether real photo analysis is available.
   *
   * "Available" means the key works, not merely that one is set — a revoked
   * key used to report aiEnabled true while every report silently came back
   * as a fallback, with nothing anywhere saying why.
   */
  @Get()
  async status() {
    const aiError = this.ai.enabled ? await this.ai.verifyKey() : null;
    return {
      ok: true,
      aiEnabled: this.ai.enabled && !aiError,
      ...(aiError ? { aiError } : {}),
    };
  }
}
