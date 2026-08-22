import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hazard } from './hazard.entity';
import { Verdict } from '../ai/verdict';

/** Two reports of the same pothole should be one pin, not two. */
export const MERGE_RADIUS_M = 40;

export function haversineMeters(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

@Injectable()
export class HazardsService {
  constructor(
    @InjectRepository(Hazard) private readonly hazards: Repository<Hazard>,
  ) {}

  findAll(): Promise<Hazard[]> {
    return this.hazards.find({
      relations: { reports: true },
      order: { createdAt: 'DESC' },
    });
  }

  findOne(id: string): Promise<Hazard | null> {
    return this.hazards.findOne({ where: { id }, relations: { reports: true } });
  }

  count(): Promise<number> {
    return this.hazards.count();
  }

  save(hazard: Hazard): Promise<Hazard> {
    return this.hazards.save(hazard);
  }

  /** The closest active hazard within the merge radius, if there is one. */
  async findNearestActive(
    at: { lng: number; lat: number },
    radiusM = MERGE_RADIUS_M,
  ): Promise<Hazard | null> {
    const active = await this.hazards.find({ where: { status: 'active' } });

    let best: Hazard | null = null;
    let bestDistance = radiusM;

    for (const hazard of active) {
      const d = haversineMeters(at, hazard);
      if (d <= bestDistance) {
        best = hazard;
        bestDistance = d;
      }
    }
    return best;
  }

  /** A brand-new pin, described by whatever the model saw in the photo. */
  createFromVerdict(
    at: { lng: number; lat: number },
    verdict: Verdict,
    streetName = 'Unnamed road',
  ): Promise<Hazard> {
    const hazard = this.hazards.create({
      lng: at.lng,
      lat: at.lat,
      kind: verdict.kind,
      dangerLevel: verdict.dangerLevel,
      status: 'active',
      streetName,
      // Unlit roads are the one kind that comes and goes with the clock.
      activeWindowStart: verdict.kind === 'unlit' ? 19 * 60 : null,
      activeWindowEnd: verdict.kind === 'unlit' ? 6 * 60 : null,
    });
    return this.hazards.save(hazard);
  }
}
