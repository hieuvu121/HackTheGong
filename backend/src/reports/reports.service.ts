import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './report.entity';
import { CreateReportDto } from './create-report.dto';
import { Hazard } from '../hazards/hazard.entity';
import { HazardsService } from '../hazards/hazards.service';
import { AiService } from '../ai/ai.service';
import { fallbackClearDays, Verdict } from '../ai/verdict';
import { PhotoStorageService } from './photo-storage.service';

export interface UploadedPhoto {
  buffer: Buffer;
  mimetype: string;
}

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
    const verdict = await this.settleVerdict(dto, photo);
    const at = { lng: dto.lng, lat: dto.lat };
    const intent = dto.intent ?? 'report';

    let hazard = dto.hazardId ? await this.hazards.findOne(dto.hazardId) : null;
    if (dto.hazardId && !hazard) {
      throw new NotFoundException(`No hazard with id ${dto.hazardId}`);
    }

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
      aiSource: verdict.source,
    });

    return this.reports.save(report);
  }
}
