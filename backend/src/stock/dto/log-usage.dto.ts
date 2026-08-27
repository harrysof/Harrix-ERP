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
}
