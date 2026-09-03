import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { t } from '../../i18n/messages/index.js';

export class LoginDto {
  @IsString()
  @IsNotEmpty({ message: () => t('auth.usernameRequired') })
  @MaxLength(100)
  login!: string;

  @IsString()
  @IsNotEmpty({ message: () => t('auth.passwordRequired') })
  @MaxLength(200)
  password!: string;
}
