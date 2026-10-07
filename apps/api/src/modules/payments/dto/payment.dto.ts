import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export type PaymentMethodCode = 'cash' | 'card' | 'wallet' | 'online' | 'bank_transfer' | 'cod';

export class CreatePaymentDto {
  @ApiProperty()
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: ['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'] })
  @IsIn(['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'])
  method!: PaymentMethodCode;
}

export class RefundDto {
  @ApiPropertyOptional({ description: 'Defaults to the remaining refundable amount' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.01)
  amount?: number;

  @ApiProperty({ description: 'Mandatory reason for the refund' })
  @IsString() @IsNotEmpty()
  reason!: string;
}

export class PaymentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'] })
  @IsOptional() @IsIn(['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'])
  method?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  merchantId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  to?: string;
}
