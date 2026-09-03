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
import { DISCOUNT_TYPES, SHIPMENT_STATUSES } from '../sales-math.js';
import { t } from '../../i18n/messages/index.js';

export class OrderLineDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  /** Per-line discount in DZD. */
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
}

/**
 * Note what is absent: subtotal, total, and any other computed figure. §16
 * says the user should not have to calculate them, so the API does not accept
 * them — sending one would let a client's arithmetic override the server's.
 */
export class CreateOrderDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsIn(SHIPMENT_STATUSES)
  shipmentStatus?: string;

  /**
   * A deposit paid at order time (e.g. a counter sale, or a client paying
   * half up front) — in DZD, never more than the order total. paymentStatus
   * is derived from this, not typed directly (see sales-math.ts's
   * paymentStatusOf); omit it for a normal order-on-credit.
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
   * sales/sales-math.ts's orderTotals), never stored as a flat figure.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1, { message: () => t('common.taxRateFraction') })
  taxRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Overrides for the address snapshot; each defaults to the customer's own. */
  @IsOptional() @IsString() shipToName?: string;
  @IsOptional() @IsString() shipToPhone?: string;
  @IsOptional() @IsString() shipToEmail?: string;
  @IsOptional() @IsString() shipToAddress?: string;
  @IsOptional() @IsString() shipToCity?: string;
  @IsOptional() @IsString() shipToProvince?: string;
  @IsOptional() @IsString() shipToCountry?: string;
  @IsOptional() @IsString() shipToPostalCode?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines!: OrderLineDto[];
}

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerId?: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

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

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1, { message: () => t('common.taxRateFraction') })
  taxRate?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional() @IsString() shipToName?: string;
  @IsOptional() @IsString() shipToPhone?: string;
  @IsOptional() @IsString() shipToEmail?: string;
  @IsOptional() @IsString() shipToAddress?: string;
  @IsOptional() @IsString() shipToCity?: string;
  @IsOptional() @IsString() shipToProvince?: string;
  @IsOptional() @IsString() shipToCountry?: string;
  @IsOptional() @IsString() shipToPostalCode?: string;

  /** Replaces every line. Refused once the order has shipped. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  lines?: OrderLineDto[];
}

export class SetOrderStatusDto {
  /** Only PENDING or CANCELLED — shipping goes through the ship endpoint. */
  @IsOptional()
  @IsIn(SHIPMENT_STATUSES)
  shipmentStatus?: string;

  /**
   * Only CANCELLED — PENDING/PARTIAL/PAID are derived from amountPaid (see
   * sales-math.ts's paymentStatusOf) and set through recordPayment instead,
   * so they can never disagree with the money actually recorded.
   */
  @IsOptional()
  @IsIn(['CANCELLED'])
  paymentStatus?: string;
}

/** How much the customer paid just now — added to amountPaid, never typed as an absolute total. */
export class RecordPaymentDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsISO8601()
  date?: string;
}

export class ShipOrderDto {
  /** Defaults to today. */
  @IsOptional()
  @IsISO8601()
  date?: string;

  /** Mark it paid at the same time — the common counter-sale case. */
  @IsOptional()
  @IsBoolean()
  markPaid?: boolean;
}

/** One line of a return: how much of one shipped order line came back. */
export class ReturnOrderLineDto {
  @IsString()
  @IsNotEmpty()
  orderLineId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;
}

export class ReturnOrderDto {
  @IsISO8601()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnOrderLineDto)
  lines!: ReturnOrderLineDto[];

  /** Why the goods came back, e.g. "ne convient pas au client". */
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
