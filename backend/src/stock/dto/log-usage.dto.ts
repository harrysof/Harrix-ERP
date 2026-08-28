import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class LogUsageDto {
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsISO8601()
  date!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  /** Required by the service when the item's inventory type has batches (chemicals). */
  @IsOptional()
  @IsString()
  batchId?: string;

  /** Maintenance context — used by spare-parts usages (maintenance continuity). */
  @IsOptional()
  @IsString()
  machine?: string;

  @IsOptional()
  @IsString()
  maintenanceRef?: string;

  @IsOptional()
  @IsString()
  employee?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Production character class for finished goods ("1er"/"2ème"/"rebut") — validated in the service. */
  @IsOptional()
  @IsString()
  quality?: string;
}
