import { IsIn, IsISO8601, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ZAKAT_METHODOLOGIES } from '../zakat-math.js';

export class CreateZakatCalculationDto {
  @IsISO8601()
  calculationDate!: string;

  @IsOptional()
  @IsIn(ZAKAT_METHODOLOGIES, { message: 'La méthodologie doit être LUNAR ou SOLAR.' })
  methodology?: string;

  @IsNumber()
  @Min(0)
  goldPricePerGram!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cash?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bank?: number;

  @IsNumber()
  @Min(0)
  finishedGoodsValue!: number;

  @IsNumber()
  @Min(0)
  rawMaterialsValue!: number;

  @IsNumber()
  @Min(0)
  receivablesValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherAssets?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductions?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  zakatRate?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Records progress toward paying a Zakat already calculated — nothing else about a past record is editable. */
export class UpdateZakatPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsOptional()
  @IsISO8601()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
