import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsISO8601,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { PRODUCTION_STATUSES } from '../production-math.js';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class ConsumptionLineDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  /** Required by the service when the item's inventory type has batches (chemicals). */
  @IsOptional()
  @IsString()
  stockBatchId?: string;
}

export class DeclareOutputDto {
  @IsNumber()
  @Min(0)
  firstChoice!: number;

  @IsNumber()
  @Min(0)
  secondChoice!: number;

  @IsNumber()
  @Min(0)
  waste!: number;

  /**
   * Correct the machine-announced figure at the same time as declaring the
   * output — the counter is often only read at the end of the shift.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedQuantity?: number;

  /** Explanation for a non-zero variance, if it is already known. */
  @IsOptional()
  @IsString()
  varianceNote?: string;

  /**
   * Credit first + second choice to finished-goods stock. Default true. Set
   * false when the goods were already received into stock some other way.
   */
  @IsOptional()
  @IsBoolean()
  creditStock?: boolean;
}

export class CreateBatchDto {
  /** Optional — the service generates "LOT-YYYY-NNNN" when omitted. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsISO8601()
  date!: string;

  @IsString()
  @IsNotEmpty()
  productItemId!: string;

  @IsString()
  @IsNotEmpty()
  machine!: string;

  @IsString()
  @IsNotEmpty()
  shift!: string;

  @IsOptional()
  @IsString()
  supervisor?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime doit être au format HH:MM.' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime doit être au format HH:MM.' })
  endTime?: string;

  @IsNumber()
  @Min(0)
  expectedQuantity!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsIn(PRODUCTION_STATUSES)
  status?: string;

  /** Materials consumed. May be empty — a batch can be planned before it runs. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumptionLineDto)
  consumptions?: ConsumptionLineDto[];

  /**
   * Output declared at creation time. When present, the whole batch —
   * consumptions, stock movements, output — is written in one transaction.
   * Omit it to create a planned/running batch and declare output later.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DeclareOutputDto)
  output?: DeclareOutputDto;
}

export class AddConsumptionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConsumptionLineDto)
  lines!: ConsumptionLineDto[];

  /** Movement date; defaults to the batch's own date. */
  @IsOptional()
  @IsISO8601()
  date?: string;
}

export class UpdateBatchDto {
  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  machine?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  shift?: string;

  @IsOptional()
  @IsString()
  supervisor?: string;

  @IsOptional()
  @IsString()
  operator?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'startTime doit être au format HH:MM.' })
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN, { message: 'endTime doit être au format HH:MM.' })
  endTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedQuantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  varianceNote?: string;

  @IsOptional()
  @IsIn(PRODUCTION_STATUSES)
  status?: string;
}
