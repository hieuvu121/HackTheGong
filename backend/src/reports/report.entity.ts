import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DangerLevel, Hazard, HazardKind } from '../hazards/hazard.entity';

export type ReportIntent = 'report' | 'fix';
/**
 * Where the verdict came from — never hide a fallback behind a real one.
 *
 * 'rider' means a person corrected what the model said. Without it, a rider's
 * own sentence would be rendered as the model's, under a confidence score no
 * model ever produced for it.
 */
export type VerdictSource = 'openai' | 'fallback' | 'rider';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Hazard, (hazard) => hazard.reports, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hazardId' })
  hazard!: Hazard;

  @Column('uuid')
  hazardId!: string;

  /** Filename on disk, under UPLOAD_DIR. Served from /uploads/<file>. */
  @Column('text')
  photo!: string;

  @Column('text', { default: 'A rider' })
  reporterName!: string;

  @Column('text', { default: 'report' })
  intent!: ReportIntent;

  /** Where the rider stood when they submitted. */
  @Column('real')
  lng!: number;

  @Column('real')
  lat!: number;

  @Column('text')
  aiKind!: HazardKind;

  @Column('text')
  aiDangerLevel!: DangerLevel;

  /**
   * The model's own estimate of how sure it is, 0..1. Self-reported and not
   * calibrated — a hint for the rider, never ground truth.
   */
  @Column('real')
  aiConfidence!: number;

  @Column('text')
  aiCaption!: string;

  @Column('text', { default: 'fallback' })
  aiSource!: VerdictSource;

  @CreateDateColumn()
  createdAt!: Date;
}
