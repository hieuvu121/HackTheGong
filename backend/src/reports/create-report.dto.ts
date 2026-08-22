import { Transform } from 'class-transformer';
import { IsIn, IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';

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

  /** A rider override of the model's rating, applied to the saved report. */
  @IsOptional()
  @IsIn(['dangerous', 'moderate', 'low'])
  dangerLevel?: 'dangerous' | 'moderate' | 'low';
}
