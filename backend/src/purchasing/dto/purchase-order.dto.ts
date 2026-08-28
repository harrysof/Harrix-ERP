import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PO_STATUSES } from '../purchasing-math.js';

export class PurchaseOrderLineDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;
}

/** One line of a delivery: how much of a PO line actually arrived. */
export class ReceiptLineDto {
  @IsString()
  @IsNotEmpty()
  purchaseOrderLineId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  /** Required by the service when the item's inventory type has batches. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  batchNumber?: string;

  /** Required by the service when the item's inventory type has expiry. */
  @IsOptional()
  @IsISO8601()
  expiryDate?: string;
}

export class ReceivePurchaseOrderDto {
  @IsISO8601()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineDto)
  lines!: ReceiptLineDto[];

  /** The supplier's own delivery-note number, for matching paperwork. */
  @IsOptional()
  @IsString()
  deliveryNote?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /**
   * Accept more than was ordered. Off by default so a typo is caught, but
   * available because suppliers really do over-deliver and refusing to record
   * it would mean the stock number stops matching the shelf.
   */
  @IsOptional()
  @IsBoolean()
  allowOverDelivery?: boolean;
}

export class CreatePurchaseOrderDto {
  /** Optional — the service generates "BC-YYYY-NNNN" when omitted. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsString()
  @IsNotEmpty()
  supplierId!: string;

  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsISO8601()
  expectedDate?: string;

  @IsOptional()
  @IsIn(PO_STATUSES)
  status?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines!: PurchaseOrderLineDto[];
}

export class UpdatePurchaseOrderDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  supplierId?: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsISO8601()
  expectedDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shipping?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Replaces every line. Only accepted while the PO is DRAFT or SUBMITTED. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderLineDto)
  lines?: PurchaseOrderLineDto[];
}

export class SetPoStatusDto {
  @IsIn(PO_STATUSES)
  status!: string;
}
