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
import { PAYMENT_STATUSES, SHIPMENT_STATUSES } from '../sales-math.js';

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
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
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

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: string;

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
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: string;

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

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: string;
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
