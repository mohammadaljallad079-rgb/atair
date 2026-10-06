import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

/** Registration for a consumer account. Identity is created server-side. */
export class RegisterCustomerDto {
  @ApiProperty({ example: 'محمد أحمد' })
  @IsString() @IsNotEmpty() @MaxLength(160)
  fullName!: string;

  @ApiProperty({ example: '+966500000010' })
  @IsString() @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be a valid phone number' })
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiProperty({ minLength: 8 })
  @IsString() @MinLength(8) @MaxLength(128)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'password must contain at least one letter and one number',
  })
  password!: string;

  @ApiPropertyOptional({ description: 'Tenant slug; required when the phone is ambiguous' })
  @IsOptional() @IsString()
  tenantSlug?: string;
}

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(160) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional({ enum: ['ar', 'en'] }) @IsOptional() @IsIn(['ar', 'en']) locale?: string;
}

export class CreateCustomerAddressBodyDto {
  @ApiPropertyOptional({ default: 'home' })
  @IsOptional() @IsString() @MaxLength(40) label?: string;

  @ApiProperty({ example: 'حي العليا، شارع التخصصي، الرياض' })
  @IsString() @IsNotEmpty() @MaxLength(400)
  address!: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) details?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class UpdateCustomerAddressBodyDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) address?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) details?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

/**
 * Quote input for a delivery. Deliberately carries NO price, customerId or
 * tenantId: all money and identity are resolved server-side. Pickup/dropoff
 * coordinates are optional; when present the server computes distance itself.
 */
export class CustomerQuoteDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() scheduled?: boolean;
  @ApiPropertyOptional({ enum: ['cash', 'cod'] })
  @IsOptional() @IsIn(['cash', 'cod'])
  paymentMethod?: 'cash' | 'cod';
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() pickupLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() pickupLng?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() dropoffLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() dropoffLng?: number;
  @ApiPropertyOptional({ description: 'Service area to price against when no precise coordinates are given' })
  @IsOptional() @IsUUID()
  serviceAreaId?: string;
}

export class CreateCustomerOrderDto {
  // ---- Pickup ----
  @ApiProperty({ example: 'شارع الملك فهد، الرياض' })
  @IsString() @IsNotEmpty() @MaxLength(400)
  pickupAddress!: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() pickupLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() pickupLng?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) pickupContactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) pickupContactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) pickupNotes?: string;

  // ---- Dropoff / recipient ----
  @ApiProperty({ example: 'حي العليا، الرياض' })
  @IsString() @IsNotEmpty() @MaxLength(400)
  dropoffAddress!: string;

  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() dropoffLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() dropoffLng?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) recipientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) recipientPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) deliveryInstructions?: string;

  // ---- Shipment ----
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) packageDescription?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() fragile?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) dimensions?: string;

  // ---- Scheduling ----
  @ApiPropertyOptional({ description: 'ISO datetime for a scheduled delivery' })
  @IsOptional() @IsString() scheduledPickupAt?: string;

  // ---- Payment ----
  @ApiPropertyOptional({ enum: ['cash', 'cod'], description: 'Only genuinely supported methods' })
  @IsOptional() @IsIn(['cash', 'cod'])
  paymentMethod?: 'cash' | 'cod';

  @ApiPropertyOptional({ description: 'Merchandise amount collected on delivery (COD only)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  codAmount?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) notes?: string;

  @ApiPropertyOptional({ description: 'Service area to price against when no precise coordinates are given' })
  @IsOptional() @IsUUID()
  serviceAreaId?: string;
}

export class CustomerOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'completed', 'cancelled'] })
  @IsOptional() @IsIn(['active', 'completed', 'cancelled'])
  bucket?: 'active' | 'completed' | 'cancelled';

  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class CancelCustomerOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class CreateCustomerTicketDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) subject!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() orderId?: string;
  @ApiPropertyOptional({ enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional() @IsIn(['low', 'normal', 'high', 'urgent'])
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export class CustomerTicketMessageDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(2000) body!: string;
}

export class CustomerTicketQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['open', 'pending', 'resolved', 'closed'] })
  @IsOptional() @IsIn(['open', 'pending', 'resolved', 'closed'])
  status?: string;
}
