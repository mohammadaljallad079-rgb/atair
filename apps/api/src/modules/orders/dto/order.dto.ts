import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class OrderItemDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() description?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  quantity?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  weightKg?: number;
}

export class OrderAddressDto {
  @ApiProperty({ enum: ['pickup', 'dropoff'] })
  @IsIn(['pickup', 'dropoff'])
  type!: 'pickup' | 'dropoff';

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(400)
  address!: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(120) contactName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500) details?: string;
}

export class CreateOrderDto {
  @ApiPropertyOptional()
  @IsOptional() @IsUUID() customerId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() merchantId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() merchantBranchId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() branchId?: string;

  @ApiPropertyOptional({ enum: ['immediate', 'scheduled', 'courier', 'internal'] })
  @IsOptional() @IsIn(['immediate', 'scheduled', 'courier', 'internal'])
  deliveryType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() vehicleTypeId?: string;

  @ApiProperty({ example: 'شارع الملك فهد، الرياض' })
  @IsString() @IsNotEmpty() @MaxLength(400)
  pickupAddress!: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() pickupLat?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() pickupLng?: number;

  @ApiProperty({ example: 'حي العليا، الرياض' })
  @IsString() @IsNotEmpty() @MaxLength(400)
  dropoffAddress!: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() dropoffLat?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber() dropoffLng?: number;

  @ApiPropertyOptional({ enum: ['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'] })
  @IsOptional() @IsIn(['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'])
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() discountCode?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional({ description: 'ISO date for scheduled delivery' })
  @IsOptional() @IsString() scheduledPickupAt?: string;

  @ApiPropertyOptional({ description: 'Merchandise amount collected on delivery (COD only)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  codAmount?: number;

  @ApiPropertyOptional({ type: [OrderAddressDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderAddressDto)
  addresses?: OrderAddressDto[];

  @ApiPropertyOptional({ description: 'Client-estimated distance in km; server recomputes' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  distanceKm?: number;

  @ApiPropertyOptional({ description: 'Client-estimated duration in minutes; server recomputes' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  durationMin?: number;

  @ApiPropertyOptional({ type: [OrderItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto)
  items?: OrderItemDto[];
}

export class UpdateOrderDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() notes?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() driverId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() vehicleId?: string;
}

export class OrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() status?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() paymentStatus?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() customerId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() driverId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() merchantId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() from?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() to?: string;
}

export class TransitionOrderDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  status!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() reason?: string;
}

export class AssignDriverDto {
  @ApiProperty()
  @IsUUID()
  driverId!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() vehicleId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean() force?: boolean;
}

export class CancelOrderDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() reason?: string;
}
