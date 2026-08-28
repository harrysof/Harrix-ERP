import { IsArray, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../auth/dto/change-password.dto.js';

/** Letters, digits, dot, dash, underscore. Keeps logins typeable on a phone keypad. */
const LOGIN_PATTERN = /^[a-zA-Z0-9._-]+$/;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(LOGIN_PATTERN, { message: "L'identifiant ne peut contenir que des lettres, chiffres, points, tirets et underscores." })
  login!: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom complet est obligatoire.' })
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` })
  @MaxLength(200)
  password!: string;

  @IsString()
  @IsNotEmpty()
  roleId!: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(LOGIN_PATTERN, { message: "L'identifiant ne peut contenir que des lettres, chiffres, points, tirets et underscores." })
  login?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName?: string;

  @IsOptional()
  @IsString()
  roleId?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: `Le mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` })
  @MaxLength(200)
  newPassword!: string;
}

/** Shared by the role DTOs — permissions arrive as an array of strings. */
export class PermissionListDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
