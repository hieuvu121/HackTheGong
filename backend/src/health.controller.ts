import { Controller, Get } from '@nestjs/common';
import { AiService } from './ai/ai.service';

@Controller('api/health')
export class HealthController {
  constructor(private readonly ai: AiService) {}

  /** Tells the app whether real photo analysis is available or not. */
  @Get()
  status() {
    return { ok: true, aiEnabled: this.ai.enabled };
  }
}
