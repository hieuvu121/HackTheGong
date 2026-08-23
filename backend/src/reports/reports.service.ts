import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportIntent } from './report.entity';
import { CreateReportDto } from './create-report.dto';
import { Hazard } from '../hazards/hazard.entity';
import { HazardsService } from '../hazards/hazards.service';
import { AiService } from '../ai/ai.service';
import { fallbackClearDays, FixVerdict, Verdict } from '../ai/verdict';
import { PhotoStorageService } from './photo-storage.service';

export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
}

/**
 * Fix reports needed before a hazard comes off the map.
 *
 * Two, not one: a hazard retired on a single photo is a hazard any one person
 * can remove for everybody. The first fix leaves it routed around while the
 * map reads it as "might be done"; the second is the confirmation.
 */
export const FIXES_TO_RETIRE = 2;

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    private readonly hazards: HazardsService,
    private readonly ai: AiService,
    private readonly photos: PhotoStorageService,
  ) {}

  findAll(): Promise<Report[]> {
    return this.reports.find({ order: { createdAt: 'DESC' } });
  }

  analyze(photo: UploadedPhoto): Promise<Verdict> {
    return this.ai.analyze(photo.buffer, photo.mimetype);
  }

  /**
   * Check a photo against the hazard it claims to have fixed.
   *
   * The hazard's latest description is what the model compares against — asked
   * in isolation it would call any tidy photo "fixed", including a stretch of
   * road that never had a hazard on it.
   */
  async assessFix(hazardId: string, photo: UploadedPhoto): Promise<FixVerdict> {
    const hazard = await this.hazards.findOne(hazardId);
    if (!hazard) throw new NotFoundException(`No hazard with id ${hazardId}`);

    const latest = [...(hazard.reports ?? [])].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    ).at(-1);

    return this.ai.assessFix(photo.buffer, photo.mimetype, {
      kind: hazard.kind,
      caption: latest?.aiCaption ?? '',
    });
  }

  /**
   * The verdict to file this report under.
   *
   * The app analyses the photo before submitting, shows the result, and lets
   * the rider correct it — so by the time it arrives here the verdict is
   * already settled, and re-reading the photo would be a second billed call
   * that could disagree with what the rider approved and quietly overwrite
   * their correction. Any other caller sends no verdict and still gets one.
   */
  private async settleVerdict(dto: CreateReportDto, photo: UploadedPhoto): Promise<Verdict> {
    if (dto.kind && dto.caption) {
      return {
        kind: dto.kind,
        dangerLevel: dto.dangerLevel ?? 'moderate',
        confidence: dto.confidence ?? 0,
        caption: dto.caption,
        clearsInDays: dto.clearsInDays ?? fallbackClearDays(dto.kind),
        source: dto.verdictSource ?? 'rider',
      };
    }

    const verdict = await this.ai.analyze(photo.buffer, photo.mimetype);
    // A rider who corrected the rating outranks the model.
    return { ...verdict, dangerLevel: dto.dangerLevel ?? verdict.dangerLevel };
  }

  /**
   * What to file a fix report under.
   *
   * The kind and rating are the hazard's own — a fix photo is evidence about
   * an existing hazard, not a description of a new one, and inventing a
   * classification for it put "construction, moderate" on a photo of clear
   * road. Only the caption and confidence come from the fix check.
   */
  private fixVerdict(dto: CreateReportDto, hazard: Hazard): Verdict {
    return {
      kind: hazard.kind,
      dangerLevel: hazard.dangerLevel,
      confidence: dto.confidence ?? 0,
      caption: dto.caption ?? 'Reported as fixed.',
      clearsInDays: hazard.expectedClearDays,
      source: dto.verdictSource ?? 'rider',
    };
  }

  /**
   * Store a photo, classify it, and attach it to a hazard — an existing one
   * when the rider is confirming or standing on top of one, a new pin
   * otherwise. The photo is saved before anything else, so a model failure
   * never loses the evidence.
   */
  async create(dto: CreateReportDto, photo: UploadedPhoto): Promise<Report> {
    if (!photo) throw new BadRequestException('A photo is required.');

    // Disk first: a model outage must not cost the rider the photo they stood
    // in the road to take.
    const filename = await this.photos.save(photo.buffer, photo.mimetype);
    const at = { lng: dto.lng, lat: dto.lat };
    const intent = dto.intent ?? 'report';

    let hazard = dto.hazardId ? await this.hazards.findOne(dto.hazardId) : null;
    if (dto.hazardId && !hazard) {
      throw new NotFoundException(`No hazard with id ${dto.hazardId}`);
    }

    // A fix report is answering "is it gone?", not "what is it?" — classifying
    // the photo would file proof that a pothole was repaired as a fresh
    // construction hazard, which is exactly what it used to do.
    const verdict =
      intent === 'fix' && hazard
        ? this.fixVerdict(dto, hazard)
        : await this.settleVerdict(dto, photo);

    // No target given: fold into whatever is already pinned here, or open a
    // new pin. Two riders photographing one pothole should not make two.
    if (!hazard) hazard = await this.hazards.findNearestActive(at);
    if (!hazard) hazard = await this.hazards.createFromVerdict(at, verdict, dto.streetName);

    const report = this.reports.create({
      hazardId: hazard.id,
      photo: filename,
      reporterName: dto.reporterName ?? 'A rider',
      intent,
      lng: dto.lng,
      lat: dto.lat,
      aiKind: verdict.kind,
      aiDangerLevel: verdict.dangerLevel,
      aiConfidence: verdict.confidence,
      aiCaption: verdict.caption,
      aiFixed: intent === 'fix' ? (dto.fixed ?? null) : null,
      aiSource: verdict.source,
    });

    const saved = await this.reports.save(report);
    await this.retireIfConfirmed(hazard, intent);
    return saved;
  }

  /**
   * Take the hazard off the map once enough riders agree it is gone.
   *
   * Only the unbroken run of fixes at the end of the history counts, so a
   * rider reporting the hazard is still there resets it — one photo of a
   * patched pothole should not outweigh a later photo of an open one.
   */
  private async retireIfConfirmed(hazard: Hazard, intent: ReportIntent): Promise<void> {
    if (intent !== 'fix' || hazard.status === 'fixed') return;

    let run = 1; // the report just filed
    for (const previous of [...(hazard.reports ?? [])].reverse()) {
      if (previous.intent !== 'fix') break;
      run += 1;
    }

    if (run < FIXES_TO_RETIRE) return;

    hazard.status = 'fixed';
    await this.hazards.setStatus(hazard.id, 'fixed');
  }
}
