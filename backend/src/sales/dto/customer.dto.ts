import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { t } from '../../i18n/messages/index.js';

export class CreateCustomerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsString()
  @IsNotEmpty({ message: () => t('common.fullNameRequired') })
  @MaxLength(150)
  fullName!: string;

  /** Optional: a walk-in customer may have no email. Validated only if given. */
  @IsOptional()
  @IsEmail({}, { message: () => t('common.emailInvalid') })
  email?: string;

  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) province?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  /** Numéro d'Identification Fiscale. */
  @IsOptional() @IsString() @MaxLength(50) nif?: string;
  /** Numéro du Registre de Commerce. */
  @IsOptional() @IsString() @MaxLength(50) rc?: string;
  /** Article d'Imposition. */
  @IsOptional() @IsString() @MaxLength(50) ai?: string;
  /** Numéro d'Identification Statistique. */
  @IsOptional() @IsString() @MaxLength(50) nis?: string;
  /** A URL (http/https) or a data-URI (inline image) — same convention as Item.photoUrl. */
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: () => t('common.emailInvalid') })
  email?: string;

  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) province?: string;
  @IsOptional() @IsString() @MaxLength(100) country?: string;
  @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  /** Numéro d'Identification Fiscale. */
  @IsOptional() @IsString() @MaxLength(50) nif?: string;
  /** Numéro du Registre de Commerce. */
  @IsOptional() @IsString() @MaxLength(50) rc?: string;
  /** Article d'Imposition. */
  @IsOptional() @IsString() @MaxLength(50) ai?: string;
  /** Numéro d'Identification Statistique. */
  @IsOptional() @IsString() @MaxLength(50) nis?: string;
  /** A URL (http/https) or a data-URI (inline image) — same convention as Item.photoUrl. */
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}
