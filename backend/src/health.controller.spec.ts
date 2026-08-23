import { AiService } from './ai/ai.service';
import { HealthController } from './health.controller';

const aiWith = (over: Partial<AiService>) => over as unknown as AiService;

describe('HealthController', () => {
  it('reports analysis unavailable when no key is configured', async () => {
    const controller = new HealthController(
      aiWith({ enabled: false, verifyKey: jest.fn().mockResolvedValue(null) }),
    );
    await expect(controller.status()).resolves.toEqual({ ok: true, aiEnabled: false });
  });

  it('reports analysis available when the key actually works', async () => {
    const controller = new HealthController(
      aiWith({ enabled: true, verifyKey: jest.fn().mockResolvedValue(null) }),
    );
    await expect(controller.status()).resolves.toEqual({ ok: true, aiEnabled: true });
  });

  /**
   * The bug this exists for: a revoked key left aiEnabled true, so the app
   * promised analysis it could not do and every report came back as a
   * fallback with no explanation anywhere.
   */
  it('reports analysis unavailable when a key is present but rejected', async () => {
    const controller = new HealthController(
      aiWith({
        enabled: true,
        verifyKey: jest.fn().mockResolvedValue('401 Incorrect API key provided'),
      }),
    );
    await expect(controller.status()).resolves.toEqual({
      ok: true,
      aiEnabled: false,
      aiError: '401 Incorrect API key provided',
    });
  });
});
