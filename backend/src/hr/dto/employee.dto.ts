import { IsIn, IsInt, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CONTRACT_TYPES, MARITAL_STATUSES } from '../payroll-math.js';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  position!: string;

  @IsISO8601()
  hireDate!: string;

  @IsOptional()
  @IsISO8601()
  birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  nin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  cnasNumber?: string;

  @IsOptional()
  @IsIn(CONTRACT_TYPES, { message: 'Le type de contrat doit être CDI ou CDD.' })
  contractType?: string;

  /** Required when contractType is CDD — checked in the service, not here, since it depends on another field. */
  @IsOptional()
  @IsISO8601()
  contractEndDate?: string;

  @IsOptional()
  @IsIn(MARITAL_STATUSES, { message: 'Situation familiale invalide.' })
  maritalStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  dependentChildren?: number;

  @IsNumber()
  @Min(0)
  salary!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24)
  expectedHoursPerDay?: number;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  bankRib?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

/** Everything is optional on update — archiving has its own dedicated endpoint. */
export class UpdateEmployeeDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) fullName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) position?: string;
  @IsOptional() @IsISO8601() hireDate?: string;
  @IsOptional() @IsISO8601() birthDate?: string;
  @IsOptional() @IsString() @MaxLength(30) nin?: string;
  @IsOptional() @IsString() @MaxLength(30) cnasNumber?: string;

  @IsOptional()
  @IsIn(CONTRACT_TYPES, { message: 'Le type de contrat doit être CDI ou CDD.' })
  contractType?: string;

  @IsOptional() @IsISO8601() contractEndDate?: string;

  @IsOptional()
  @IsIn(MARITAL_STATUSES, { message: 'Situation familiale invalide.' })
  maritalStatus?: string;

  @IsOptional() @IsInt() @Min(0) @Max(20) dependentChildren?: number;
  @IsOptional() @IsNumber() @Min(0) salary?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(24) expectedHoursPerDay?: number;
  @IsOptional() @IsString() @MaxLength(60) bankRib?: string;
  @IsOptional() @IsString() @MaxLength(120) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyContactPhone?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
