import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ALLOCATION_BASES, COST_BEHAVIORS, COST_NATURES } from '../finance-math.js';

/** Shared by every endpoint that reads a period. "AAAA-MM", the accounting unit. */
const MONTH_MESSAGE = 'Le mois doit être au format AAAA-MM (ex. "2026-08").';
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class PeriodQueryDto {
  @IsOptional()
  @IsString()
  @Matches(MONTH_PATTERN, { message: MONTH_MESSAGE })
  month?: string;

  /**
   * A range, when the accountant wants a quarter or a year. `to` alone is
   * meaningless, so the service treats a missing `from` as "same month".
   */
  @IsOptional()
  @IsString()
  @Matches(MONTH_PATTERN, { message: MONTH_MESSAGE })
  from?: string;

  @IsOptional()
  @IsString()
  @Matches(MONTH_PATTERN, { message: MONTH_MESSAGE })
  to?: string;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export class CreateCostCategoryDto {
  /**
   * Stable machine key — same rule as InventoryType.key, and for the same
   * reason: it ends up in seed data and a key that changed with a rename
   * would orphan everything pointing at it.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'La clé ne peut contenir que des minuscules, des chiffres et des tirets (ex. "gardiennage").',
  })
  key!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  label!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsIn(COST_NATURES, { message: 'La nature doit être DIRECT (rattachable à un produit) ou INDIRECT (à répartir).' })
  nature!: string;

  @IsIn(COST_BEHAVIORS, { message: 'Le comportement doit être FIXED (charge fixe) ou VARIABLE (varie avec le volume).' })
  behavior!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

/** Everything except `key` and `isMaterials`: neither can move after creation. */
export class UpdateCostCategoryDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(60) label?: string;
  @IsOptional() @IsString() @MaxLength(400) description?: string;

  @IsOptional()
  @IsIn(COST_NATURES, { message: 'La nature doit être DIRECT ou INDIRECT.' })
  nature?: string;

  @IsOptional()
  @IsIn(COST_BEHAVIORS, { message: 'Le comportement doit être FIXED ou VARIABLE.' })
  behavior?: string;

  @IsOptional() @IsInt() sortOrder?: number;
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

export class CreateCostEntryDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  /**
   * Always positive. A correction is its own entry with its own label, not a
   * negative number hiding inside a total — the register has to stay readable
   * line by line.
   */
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsDateString()
  date!: string;

  /**
   * The finished product this cost belongs to, when it belongs to exactly
   * one. Null means it joins the pool shared across everything produced.
   */
  @IsOptional()
  @IsString()
  productItemId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  notes?: string;
}

export class UpdateCostEntryDto {
  @IsOptional() @IsString() @IsNotEmpty() categoryId?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) label?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @IsString() productItemId?: string | null;
  @IsOptional() @IsString() @MaxLength(400) notes?: string;
}

/**
 * Copy a month's typed charges into another month.
 *
 * The rent is the same every month, and re-typing it is exactly the friction
 * that makes an accountant abandon a cost register. This is deliberately a
 * copy and not a recurrence rule: every resulting entry is a normal row he
 * can edit or delete, with nothing generating anything behind his back.
 */
export class DuplicateMonthDto {
  @IsString()
  @Matches(MONTH_PATTERN, { message: MONTH_MESSAGE })
  from!: string;

  @IsString()
  @Matches(MONTH_PATTERN, { message: MONTH_MESSAGE })
  to!: string;

  /** Leave out the variable charges, which differ every month by definition. */
  @IsOptional()
  @IsBoolean()
  fixedOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Material-cost correction
// ---------------------------------------------------------------------------

export class SetMaterialOverrideDto {
  @IsString()
  @Matches(MONTH_PATTERN, { message: MONTH_MESSAGE })
  month!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  /**
   * Required. A correction without a reason is indistinguishable from a typo
   * six months later — and the whole point of keeping the computed figure
   * beside it is that someone can judge which one to believe.
   */
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  reason!: string;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export class UpdateFinanceSettingsDto {
  /**
   * Markup on cost, as a fraction. Capped at 10 (i.e. +1000 %) to catch the
   * obvious slip of typing 25 for "25 %".
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultMargin?: number;

  @IsOptional()
  @IsIn(ALLOCATION_BASES, {
    message: 'La base de répartition doit être UNITS (unités produites) ou MATERIAL_COST (coût des matières).',
  })
  allocationBasis?: string;
}

/** Per-product margin, set from the Prix view. Null restores the factory default. */
export class SetProductMarginDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  targetMargin?: number | null;
}
