import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ABSENCE_TYPES } from '../payroll-math.js';

export class CreateAbsenceDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsIn(ABSENCE_TYPES, { message: 'Le type doit être CONGE, MALADIE ou INJUSTIFIEE.' })
  type!: string;

  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
