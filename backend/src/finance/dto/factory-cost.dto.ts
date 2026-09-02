import { IsISO8601, IsNotEmpty, IsNumber, IsString, Matches, Min, MaxLength } from 'class-validator';

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
  @Matches(/^\d{4}-\d{2}$/, { message: 'Mois source invalide (format AAAA-MM attendu).' })
  from!: string;

  @Matches(/^\d{4}-\d{2}$/, { message: 'Mois cible invalide (format AAAA-MM attendu).' })
  to!: string;
}
