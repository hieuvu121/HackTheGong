import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hazard, HazardStatus } from './hazard.entity';
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

  /**
   * Take a hazard off the map, touching nothing but its status.
   *
   * A column update rather than save(): saving a hazard whose `reports` were
   * loaded before the newest one was inserted makes TypeORM treat that report
   * as removed from the relation and null its foreign key, which the schema
   * rejects. Nothing here needs the relation, so nothing here loads it.
   */
  async setStatus(id: string, status: HazardStatus): Promise<void> {
    await this.hazards.update(id, { status });
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
      expectedClearDays: verdict.clearsInDays,
      // No window. An unlit road comes and goes with the clock, but with the
      // sun rather than a stamped hour — darkness moves over three hours
      // across the year here, so a stored 19:00 would be wrong for most of it
      // and would only contradict what the app computes from the position.
      activeWindowStart: null,
      activeWindowEnd: null,
    });
    return this.hazards.save(hazard);
  }
}
