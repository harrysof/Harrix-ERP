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
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { DISCOUNT_TYPES, PO_STATUSES } from '../purchasing-math.js';
import { t } from '../../i18n/messages/index.js';

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

  /**
   * A deposit paid to the supplier at order time — in DZD, never more than
   * the order total. paymentStatus is derived from this, not typed directly
   * (see purchasing-math.ts's paymentStatusOf); omit it to order on credit.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shipping?: number;

  /**
   * A DZD amount when discountType is FIXED (the default), or a fraction
   * (0.10 for 10 %) when it's PERCENT — validated against discountType in
   * the service, since class-validator can't compare two fields inline here.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: string;

  /**
   * A fraction, not a DZD amount — 0.19 for 19 %. The system computes the
   * actual tax from this and the order's other figures (see
   * purchasing-math.ts's poTotals); typing a rate rather than a total keeps
   * the amount from drifting whenever a line, the shipping or the discount
   * changes.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1, { message: () => t('common.taxRateFraction') })
  taxRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Original filename of the attached invoice/bon de commande, if any. */
  @IsOptional()
  @IsString()
  invoiceFileName?: string;

  /** The attached invoice/bon de commande as a data-URI (PDF, Word or image). */
  @IsOptional()
  @IsString()
  invoiceFileUrl?: string;

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

  /**
   * A DZD amount when discountType is FIXED (the default), or a fraction
   * (0.10 for 10 %) when it's PERCENT — validated against discountType in
   * the service, since class-validator can't compare two fields inline here.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsIn(DISCOUNT_TYPES)
  discountType?: string;

  /**
   * A fraction, not a DZD amount — 0.19 for 19 %. The system computes the
   * actual tax from this and the order's other figures (see
   * purchasing-math.ts's poTotals); typing a rate rather than a total keeps
   * the amount from drifting whenever a line, the shipping or the discount
   * changes.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1, { message: () => t('common.taxRateFraction') })
  taxRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Original filename of the attached invoice/bon de commande. Send an empty string to remove it. */
  @IsOptional()
  @IsString()
  invoiceFileName?: string;

  /** The attached invoice/bon de commande as a data-URI. Send an empty string to remove it. */
  @IsOptional()
  @IsString()
  invoiceFileUrl?: string;

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

/** How much was just paid to the supplier — added to amountPaid, never typed as an absolute total. */
export class RecordPoPaymentDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsISO8601()
  date?: string;
}
