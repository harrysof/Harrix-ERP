import { IsNumber, Min } from 'class-validator';

export class SetGoldPriceDto {
  @IsNumber()
  @Min(0)
  pricePerGram!: number;
}
