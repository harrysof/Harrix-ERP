import { IsArray, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '../../auth/dto/change-password.dto.js';
import { t } from '../../i18n/messages/index.js';

/** Letters, digits, dot, dash, underscore. Keeps logins typeable on a phone keypad. */
const LOGIN_PATTERN = /^[a-zA-Z0-9._-]+$/;

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(LOGIN_PATTERN, { message: () => t('users.loginPattern') })
  login!: string;

  @IsString()
  @IsNotEmpty({ message: () => t('common.fullNameRequired') })
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: () => t('common.passwordMinLength', { count: MIN_PASSWORD_LENGTH }) })
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
  @Matches(LOGIN_PATTERN, { message: () => t('users.loginPattern') })
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
  @MinLength(MIN_PASSWORD_LENGTH, { message: () => t('common.passwordMinLength', { count: MIN_PASSWORD_LENGTH }) })
  @MaxLength(200)
  newPassword!: string;
}

/** Shared by the role DTOs — permissions arrive as an array of strings. */
export class PermissionListDto {
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
