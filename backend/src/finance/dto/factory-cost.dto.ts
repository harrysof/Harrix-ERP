import { IsISO8601, IsNotEmpty, IsNumber, IsString, Matches, Min, MaxLength } from 'class-validator';
import { t } from '../../i18n/messages/index.js';

export class CreateFactoryCostDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsISO8601()
  date!: string;
}

export class CopyFactoryCostsDto {
  @Matches(/^\d{4}-\d{2}$/, { message: () => t('finance.invalidSourceMonth') })
  from!: string;

  @Matches(/^\d{4}-\d{2}$/, { message: () => t('finance.invalidTargetMonth') })
  to!: string;
}
