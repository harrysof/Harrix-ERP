import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

/**
 * Batch details captured when a supplier order is received, one entry per
 * line that involves batch-tracked items (e.g. chemicals). Lines of regular
 * inventory (tige, spare parts) don't need an entry.
 */
export class ReceiveSupplierOrderLineDto {
  @IsString()
  @IsNotEmpty()
  lineId!: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}

export class ReceiveSupplierOrderDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveSupplierOrderLineDto)
  lines?: ReceiveSupplierOrderLineDto[];
}