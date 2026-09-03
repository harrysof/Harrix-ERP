import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { t } from '../../i18n/messages/index.js';

/** Minimum length is enforced here and in users.service.ts — one constant, two callers. */
export const MIN_PASSWORD_LENGTH = 8;

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: () => t('auth.newPasswordMinLength', { count: MIN_PASSWORD_LENGTH }) })
  @MaxLength(200)
  newPassword!: string;
}
