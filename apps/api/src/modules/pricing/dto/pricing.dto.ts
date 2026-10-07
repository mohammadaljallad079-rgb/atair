import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  PRICING_COMPONENT_TYPES,
  PricingComponentType,
  PricingRuleInput,
} from '../pricing.engine';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class PricingComponentDto {
  @ApiProperty({ enum: PRICING_COMPONENT_TYPES as unknown as string[] })
  @IsIn(PRICING_COMPONENT_TYPES as unknown as string[])
  type!: PricingComponentType;

  @ApiProperty()
  @Type(() => Number) @IsNumber() @Min(0)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  minValue?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  maxValue?: number | null;

  @ApiPropertyOptional()
  @IsOptional() @IsObject()
  meta?: Record<string, any> | null;
}

export class CreatePricingRuleDto implements Partial<PricingRuleInput> {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  merchantId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  vehicleTypeId?: string;

  @ApiPropertyOptional({ enum: ['immediate', 'scheduled', 'courier', 'internal'] })
  @IsOptional() @IsIn(['immediate', 'scheduled', 'courier', 'internal'])
  deliveryType?: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsInt()
  priority?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ISO date; rule applies from this instant' })
  @IsOptional() @IsString()
  validFrom?: string | null;

  @ApiPropertyOptional({ description: 'ISO date; rule applies until this instant' })
  @IsOptional() @IsString()
  validTo?: string | null;

  @ApiProperty({ type: [PricingComponentDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => PricingComponentDto)
  components!: PricingComponentDto[];
}

export class UpdatePricingRuleDto extends PartialType(CreatePricingRuleDto) {}

export class PricingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional() @IsIn(['true', 'false'])
  isActive?: string;
}

export class QuoteDto {
  @ApiProperty()
  @Type(() => Number) @IsNumber() @Min(0)
  distanceKm!: number;

  @ApiProperty()
  @Type(() => Number) @IsNumber() @Min(0)
  durationMin!: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  weightKg?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  scheduled?: boolean;

  @ApiPropertyOptional({ enum: ['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'] })
  @IsOptional() @IsIn(['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'])
  paymentMethod?: 'cash' | 'card' | 'wallet' | 'online' | 'bank_transfer' | 'cod';

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  merchantId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  vehicleTypeId?: string;

  @ApiPropertyOptional({ enum: ['immediate', 'scheduled', 'courier', 'internal'] })
  @IsOptional() @IsIn(['immediate', 'scheduled', 'courier', 'internal'])
  deliveryType?: string;
}
