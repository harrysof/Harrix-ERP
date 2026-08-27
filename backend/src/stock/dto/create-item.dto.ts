import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  inventoryTypeId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  reference!: string;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsNumber()
  @Min(0)
  reorderThreshold!: number;
}
