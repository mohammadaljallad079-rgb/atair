import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class WalletAdjustDto {
  @ApiProperty({ enum: ['credit', 'debit', 'payout', 'adjustment'] })
  @IsIn(['credit', 'debit', 'payout', 'adjustment'])
  type!: 'credit' | 'debit' | 'payout' | 'adjustment';

  @ApiProperty()
  @Type(() => Number) @IsNumber() @Min(0.01)
  amount!: number;

  @ApiProperty({ description: 'Mandatory justification for the ledger movement' })
  @IsString() @IsNotEmpty()
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  reference?: string;
}
