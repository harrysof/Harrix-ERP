import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Minimum length is enforced here and in users.service.ts — one constant, two callers. */
export const MIN_PASSWORD_LENGTH = 8;

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH, { message: `Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères.` })
  @MaxLength(200)
  newPassword!: string;
}
