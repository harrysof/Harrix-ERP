import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateSupplierOrderLineDto {
  @IsString()
  @IsNotEmpty()
  itemId!: string;

  @IsNumber()
  @Min(0.01)
  quantityOrdered!: number;

  /**
   * Agreed price per unit, in DZD. Optional — an order is sometimes placed
   * before the price is settled, and the reception then falls back to the
   * article's standard cost.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}

export class CreateSupplierOrderDto {
  @IsString()
  @IsNotEmpty()
  supplierId!: string;

  @IsDateString()
  orderDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierOrderLineDto)
  lines!: CreateSupplierOrderLineDto[];
}