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