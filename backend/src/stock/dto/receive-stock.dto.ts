import { IsISO8601, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ReceiveStockDto {
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  /** Required by the service when the item's inventory type has batches (chemicals). */
  @IsOptional()
  @IsString()
  batchNumber?: string;

  /** Required by the service when the item's inventory type has expiry (chemicals). */
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  /** Production character class for finished goods ("1er"/"2ème"/"rebut") — validated in the service. */
  @IsOptional()
  @IsString()
  quality?: string;
}
