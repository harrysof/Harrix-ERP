import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';
import { t } from '../../i18n/messages/index.js';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  inventoryTypeId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  reference!: string;

  /**
   * A unit has to name something: "kg", "litre", "paire". A value of only
   * digits is refused because it produces quantities that read "0 100" and a
   * cost labelled "DZD / 100" — the frontend offers a list, this is the rule
   * behind it.
   */
  @Matches(/\p{L}/u, { message: () => t('common.unitMustBeUnit') })
  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsNumber()
  @Min(0)
  reorderThreshold!: number;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  size?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  machine?: string;

  @IsOptional()
  @IsString()
  compatibility?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  criticality?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  /** Standard purchase cost per unit, in DZD — see Item.unitCost. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;
}
