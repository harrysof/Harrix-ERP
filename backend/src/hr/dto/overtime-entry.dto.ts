import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateOvertimeEntryDto {
  @IsString()
  @IsNotEmpty()
  employeeId!: string;

  @IsISO8601()
  startDate!: string;

  @IsISO8601()
  endDate!: string;

  @IsNumber()
  @Min(0)
  @Max(400)
  hours!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
