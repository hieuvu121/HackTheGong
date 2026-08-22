import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DANGER_LEVELS, HAZARD_KINDS, Verdict } from './verdict';
import { DangerLevel, HazardKind } from '../hazards/hazard.entity';

const SYSTEM = `You classify photographs of cycling hazards for a rider safety map.
Judge only what is visible. Rate danger from the perspective of someone riding a
bicycle past this spot. Be conservative: if the photo does not clearly show a
hazard, say so in the caption and give a low confidence.`;

/** Strict Structured Outputs schema — the model cannot return anything else. */
const SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: HAZARD_KINDS },
    dangerLevel: { type: 'string', enum: DANGER_LEVELS },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    caption: { type: 'string', maxLength: 160 },
  },
  required: ['kind', 'dangerLevel', 'confidence', 'caption'],
  additionalProperties: false,
} as const;

@Injectable()
export class AiService {
  private readonly log = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string | null>('openaiApiKey');
    this.model = this.config.get<string>('openaiModel') ?? 'gpt-5.6';
    this.client = key ? new OpenAI({ apiKey: key }) : null;

    if (!this.client) {
      this.log.warn(
        'OPENAI_API_KEY is not set — photo analysis will return a labelled fallback verdict.',
      );
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  /**
   * Classify a hazard photo. Never throws: a model outage must not cost a
   * rider the report they just stood in the road to take, so failures degrade
   * to a fallback verdict the rider can correct on the next screen.
   */
  async analyze(image: Buffer, mimeType: string): Promise<Verdict> {
    if (!this.client) return this.fallback('No model configured — set a rating yourself.');

    try {
      const dataUrl = `data:${mimeType};base64,${image.toString('base64')}`;

      const response = await this.client.responses.create({
        model: this.model,
        input: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: 'Classify this cycling hazard. One sentence for the caption, plain language, no preamble.',
              },
              { type: 'input_image', image_url: dataUrl, detail: 'auto' },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'hazard_verdict',
            strict: true,
            schema: SCHEMA as unknown as Record<string, unknown>,
          },
        },
      });

      const text = response.output_text;
      if (!text) return this.fallback('The model returned nothing — set a rating yourself.');

      const parsed = JSON.parse(text) as Omit<Verdict, 'source'>;
      return {
        kind: this.coerceKind(parsed.kind),
        dangerLevel: this.coerceLevel(parsed.dangerLevel),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
        caption: String(parsed.caption ?? '').slice(0, 160),
        source: 'openai',
      };
    } catch (err) {
      this.log.error(`Photo analysis failed: ${(err as Error).message}`);
      return this.fallback('Could not reach the model — set a rating yourself.');
    }
  }

  /** Honest placeholder. Low confidence on purpose: nothing actually looked. */
  private fallback(caption: string): Verdict {
    return {
      kind: 'construction',
      dangerLevel: 'moderate',
      confidence: 0,
      caption,
      source: 'fallback',
    };
  }

  private coerceKind(value: string): HazardKind {
    return HAZARD_KINDS.includes(value as HazardKind) ? (value as HazardKind) : 'construction';
  }

  private coerceLevel(value: string): DangerLevel {
    return DANGER_LEVELS.includes(value as DangerLevel) ? (value as DangerLevel) : 'moderate';
  }
}
