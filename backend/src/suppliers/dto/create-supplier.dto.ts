import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  /**
   * Free-text registration details (registre de commerce, NIF, NIS…). One
   * field rather than four columns: the exact set differs by country and
   * nothing computes on them.
   */
  @IsOptional()
  @IsString()
  registration?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
