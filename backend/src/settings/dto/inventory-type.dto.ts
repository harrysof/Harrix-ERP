import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/**
 * The four inventories the factory started with are data, not code (see
 * schema.prisma → InventoryType), and this is what finally makes that true
 * from the outside: a fifth inventory — emballages, consommables, outillage —
 * is created from the Stock tab, not from a migration.
 *
 * The flags are the same ones the frontend already reads to decide which
 * columns and fields an inventory shows.
 */
export class CreateInventoryTypeDto {
  /**
   * Stable machine key. Lowercase letters, digits and dashes only, because it
   * ends up in URLs and in the seed data, and because a key that changes with
   * a rename would orphan everything referring to it.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'La clé ne peut contenir que des minuscules, des chiffres et des tirets (ex. "emballages").',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label!: string;

  /** The singular noun, used in empty states ("Aucun emballage enregistré"). */
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  singular!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  /**
   * A unit has to name something: "kg", "litre", "paire". A value of only
   * digits is refused because it produces quantities that read "0 100" and a
   * cost labelled "DZD / 100" — the frontend offers a list, this is the rule
   * behind it.
   */
  @Matches(/\p{L}/u, { message: "L'unité doit être une unité de mesure (kg, litre, pièce…), pas un nombre." })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  defaultUnit!: string;

  @IsOptional() @IsBoolean() hasBatches?: boolean;
  @IsOptional() @IsBoolean() hasExpiry?: boolean;
  @IsOptional() @IsBoolean() isProductionInput?: boolean;
  @IsOptional() @IsBoolean() hasColor?: boolean;
  @IsOptional() @IsBoolean() hasSize?: boolean;
  @IsOptional() @IsBoolean() hasDescription?: boolean;
  @IsOptional() @IsBoolean() hasMachineInfo?: boolean;
  @IsOptional() @IsBoolean() hasGender?: boolean;
  @IsOptional() @IsBoolean() hasPrice?: boolean;
  @IsOptional() @IsBoolean() hasQuality?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/** Everything except `key`: the machine key is what everything else points at. */
export class UpdateInventoryTypeDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) label?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) singular?: string;
  @IsOptional() @IsString() @MaxLength(400) description?: string;
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Matches(/\p{L}/u, { message: "L'unité doit être une unité de mesure (kg, litre, pièce…), pas un nombre." })
  defaultUnit?: string;

  @IsOptional() @IsBoolean() hasBatches?: boolean;
  @IsOptional() @IsBoolean() hasExpiry?: boolean;
  @IsOptional() @IsBoolean() isProductionInput?: boolean;
  @IsOptional() @IsBoolean() hasColor?: boolean;
  @IsOptional() @IsBoolean() hasSize?: boolean;
  @IsOptional() @IsBoolean() hasDescription?: boolean;
  @IsOptional() @IsBoolean() hasMachineInfo?: boolean;
  @IsOptional() @IsBoolean() hasGender?: boolean;
  @IsOptional() @IsBoolean() hasPrice?: boolean;
  @IsOptional() @IsBoolean() hasQuality?: boolean;

  @IsOptional() @IsInt() sortOrder?: number;
}
