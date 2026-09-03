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

  /** Numéro d'Identification Fiscale. */
  @IsOptional()
  @IsString()
  nif?: string;

  /** Numéro du Registre de Commerce. */
  @IsOptional()
  @IsString()
  rc?: string;

  /** Article d'Imposition. */
  @IsOptional()
  @IsString()
  ai?: string;

  /** Numéro d'Identification Statistique. */
  @IsOptional()
  @IsString()
  nis?: string;

  /** A URL (http/https) or a data-URI (inline image) — same convention as Item.photoUrl. */
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
