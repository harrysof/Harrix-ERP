import { IsISO8601, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

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

  /**
   * What one unit of THIS delivery cost, in DZD. Omitted, the service falls
   * back to the item's standard cost — a reception nobody priced still values
   * the stock, it just does so from the catalogue rather than from a
   * document.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}
