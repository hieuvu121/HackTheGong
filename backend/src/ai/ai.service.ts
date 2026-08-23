import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { DANGER_LEVELS, fallbackClearDays, HAZARD_KINDS, Verdict } from './verdict';
import { DangerLevel, HazardKind } from '../hazards/hazard.entity';

const SYSTEM = `You classify photographs of cycling hazards for a rider safety map.
Judge only what is visible. Rate danger from the perspective of someone riding a
bicycle past this spot. Be conservative: if the photo does not clearly show a
hazard, say so in the caption and give a low confidence.

For clearsInDays, estimate how many days this specific hazard is likely to take
to be repaired, judging from what the photo shows — the scale of the works, how
far along they look, how big the damage is. Answer only for potholes and
construction, which are waiting on a repair. Everything else is null: an unlit
road or a road with no shoulder is not maintenance pending and does not clear
on its own.`;

/** Strict Structured Outputs schema — the model cannot return anything else. */
const SCHEMA = {
  type: 'object',
  properties: {
    kind: { type: 'string', enum: HAZARD_KINDS },
    dangerLevel: { type: 'string', enum: DANGER_LEVELS },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    caption: { type: 'string', maxLength: 160 },
    // Nullable rather than optional: strict mode requires every property, so
    // "no estimate" has to be expressible as a value.
    clearsInDays: { type: ['integer', 'null'], minimum: 1, maximum: 3650 },
  },
  required: ['kind', 'dangerLevel', 'confidence', 'caption', 'clearsInDays'],
  additionalProperties: false,
} as const;

@Injectable()
export class AiService {
  private readonly log = new Logger(AiService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;
  /** Resolved once — a key does not become valid between requests. */
  private keyCheck: Promise<string | null> | null = null;

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
   * Ask the provider whether the key is actually good for anything.
   *
   * `enabled` only says a key was configured, which is why a revoked one could
   * sit behind a healthy-looking /api/health while every single report came
   * back as a fallback. Returns the reason it is unusable, or null when it
   * works. Cached: this is called per health check, not per request.
   */
  async verifyKey(): Promise<string | null> {
    if (!this.client) return 'No OPENAI_API_KEY configured.';
    if (this.keyCheck) return this.keyCheck;

    this.keyCheck = this.client.models
      .list()
      .then(() => null)
      .catch((err: Error) => {
        this.log.error(`OPENAI_API_KEY rejected: ${err.message}`);
        return err.message;
      });

    return this.keyCheck;
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
      const kind = this.coerceKind(parsed.kind);

      return {
        kind,
        dangerLevel: this.coerceLevel(parsed.dangerLevel),
        confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
        caption: String(parsed.caption ?? '').slice(0, 160),
        clearsInDays: this.coerceClearDays(kind, parsed.clearsInDays),
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
      // Nothing read the photo, so there is nothing to estimate from. Whoever
      // reads the hazard applies the per-kind constant instead.
      clearsInDays: null,
      source: 'fallback',
    };
  }

  /**
   * Keep an estimate only where one can mean something.
   *
   * A model asked for null will sometimes answer anyway, and an estimate on a
   * hazard that does not get repaired would put "it may already be fixed" on a
   * road that is still unlit.
   */
  private coerceClearDays(kind: HazardKind, value: unknown): number | null {
    if (fallbackClearDays(kind) === null) return null;
    const days = Math.round(Number(value));
    return Number.isFinite(days) && days > 0 ? Math.min(days, 3650) : null;
  }

  private coerceKind(value: string): HazardKind {
    return HAZARD_KINDS.includes(value as HazardKind) ? (value as HazardKind) : 'construction';
  }

  private coerceLevel(value: string): DangerLevel {
    return DANGER_LEVELS.includes(value as DangerLevel) ? (value as DangerLevel) : 'moderate';
  }
}
