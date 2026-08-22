import { Transform } from 'class-transformer';
import {
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { HAZARD_KINDS } from '../ai/verdict';
import { HazardKind } from '../hazards/hazard.entity';
import { VerdictSource } from './report.entity';

const toNumber = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? Number(value) : value;

/** Multipart fields arrive as strings, so every number is coerced first. */
export class CreateReportDto {
  @Transform(toNumber)
  @IsLongitude()
  lng!: number;

  @Transform(toNumber)
  @IsLatitude()
  lat!: number;

  @IsOptional()
  @IsIn(['report', 'fix'])
  intent?: 'report' | 'fix';

  /** Set when confirming an existing hazard rather than adding a new one. */
  @IsOptional()
  @IsString()
  hazardId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  reporterName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  streetName?: string;

  /**
   * The verdict the rider actually approved, sent back from the analysis
   * screen.
   *
   * Without these the server had to re-read the photo on submit — a second
   * billed call that could disagree with what the rider had just seen, and
   * that silently overwrote any correction they had made to it.
   */
  @IsOptional()
  @IsIn(HAZARD_KINDS)
  kind?: HazardKind;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  caption?: string;

  @Transform(toNumber)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;

  /** Named apart from `source` so it never collides with a form field. */
  @IsOptional()
  @IsIn(['openai', 'fallback', 'rider'])
  verdictSource?: VerdictSource;

  /** A rider override of the model's rating, applied to the saved report. */
  @IsOptional()
  @IsIn(['dangerous', 'moderate', 'low'])
  dangerLevel?: 'dangerous' | 'moderate' | 'low';
}
