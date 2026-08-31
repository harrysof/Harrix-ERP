import { IsIn, IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { TIME_ENTRY_SOURCES } from '../payroll-math.js';

export class CreateTimeEntryDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsISO8601()
  date!: string;

  @IsNumber()
  @Min(0)
  @Max(24)
  hoursWorked!: number;

  @IsOptional()
  @IsIn(TIME_ENTRY_SOURCES)
  source?: string;
}
