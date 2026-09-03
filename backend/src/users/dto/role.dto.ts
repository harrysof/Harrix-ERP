import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { t } from '../../i18n/messages/index.js';

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/, { message: () => t('users.roleKeyPattern') })
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions!: string[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
