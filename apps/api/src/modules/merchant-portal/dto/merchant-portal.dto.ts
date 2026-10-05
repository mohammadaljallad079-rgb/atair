import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class MerchantOrderItemDto {
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

/**
 * Merchant delivery creation. Note there is deliberately NO `merchantId`,
 * `total`, `subtotal` or `paymentStatus` field: the merchant is taken from the
 * token and all money is computed server-side.
 */
export class CreateMerchantOrderDto {
  @ApiPropertyOptional()
  @IsOptional() @IsUUID() merchantBranchId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() customerId?: string;

  @ApiPropertyOptional({ enum: ['immediate', 'scheduled', 'courier', 'internal'] })
  @IsOptional() @IsIn(['immediate', 'scheduled', 'courier', 'internal'])
  deliveryType?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID() vehicleTypeId?: string;

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
  @ApiPropertyOptional({ description: 'ISO datetime for scheduled delivery' })
  @IsOptional() @IsString() scheduledPickupAt?: string;

  // ---- Payment ----
  @ApiPropertyOptional({ enum: ['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'] })
  @IsOptional() @IsIn(['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Merchandise amount the driver collects (COD only)' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  codAmount?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200) notes?: string;

  @ApiPropertyOptional({ type: [MerchantOrderItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MerchantOrderItemDto)
  items?: MerchantOrderItemDto[];
}

export class MerchantQuoteDto {
  @ApiPropertyOptional({ description: 'Distance in km. Optional: when pickup/dropoff coordinates are supplied the server computes it.' })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) distanceKm?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) durationMin?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() scheduled?: boolean;
  @ApiPropertyOptional({ enum: ['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'] })
  @IsOptional() @IsIn(['cash', 'card', 'wallet', 'online', 'bank_transfer', 'cod'])
  paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() vehicleTypeId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() merchantBranchId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() pickupLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() pickupLng?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() dropoffLat?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() dropoffLng?: number;
}

/** Base list query that allows an explicit (validated) merchant selector. */
export class MerchantScopedQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Must be one of the caller\'s merchants' })
  @IsOptional() @IsUUID()
  merchantId?: string;
}

export class MerchantOrderQueryDto extends MerchantScopedQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentStatus?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() paymentMethod?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() merchantBranchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
}

export class MerchantCustomerQueryDto extends MerchantScopedQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class MerchantBranchQueryDto extends MerchantScopedQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class MerchantPaymentQueryDto extends MerchantScopedQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() method?: string;
}

export class MerchantCodQueryDto extends MerchantScopedQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
}

export class MerchantSettlementQueryDto extends MerchantScopedQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class MerchantTicketQueryDto extends MerchantScopedQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() status?: string;
}

export class ImportOrderRowDto {
  @ApiProperty() @IsString() @IsNotEmpty() pickupAddress!: string;
  @ApiProperty() @IsString() @IsNotEmpty() dropoffAddress!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recipientName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() recipientPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() packageDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) clientRef?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) weightKg?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) codAmount?: number;
}

export class ImportOrdersDto {
  @ApiPropertyOptional()
  @IsOptional() @IsUUID() merchantBranchId?: string;

  @ApiProperty({ description: 'Set to false to preview validation without inserting' })
  @IsOptional() @IsBoolean()
  confirm?: boolean;

  @ApiProperty({ type: [ImportOrderRowDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ImportOrderRowDto)
  rows!: ImportOrderRowDto[];
}

export class CreateMerchantBranchDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(400) address!: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional() @IsIn(['active', 'inactive']) status?: string;
}

export class CreateMerchantCustomerDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) fullName!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(40) phone!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateMerchantCustomerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class CreateMerchantAddressDto {
  @ApiPropertyOptional({ default: 'home' }) @IsOptional() @IsString() @MaxLength(60) label?: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(400) address!: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() latitude?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() longitude?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(300) details?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isDefault?: boolean;
}

export class InviteTeamMemberDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) fullName!: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiProperty({ description: 'Initial password; the user is created active' })
  @IsString() @MinLength(8) password!: string;
  @ApiProperty({ enum: ['owner', 'manager', 'operator', 'finance', 'viewer'] })
  @IsIn(['owner', 'manager', 'operator', 'finance', 'viewer'])
  roleSlug!: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
}

export class UpdateTeamMemberDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) fullName?: string;
  @ApiPropertyOptional({ enum: ['owner', 'manager', 'operator', 'finance', 'viewer'] })
  @IsOptional() @IsIn(['owner', 'manager', 'operator', 'finance', 'viewer']) roleSlug?: string;
  @ApiPropertyOptional({ enum: ['active', 'suspended'] })
  @IsOptional() @IsIn(['active', 'suspended']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() branchId?: string;
}

export class CreateMerchantTicketDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) subject!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() orderId?: string;
  @ApiPropertyOptional({ enum: ['low', 'normal', 'high', 'urgent'] })
  @IsOptional() @IsIn(['low', 'normal', 'high', 'urgent']) priority?: string;
}

export class MerchantTicketMessageDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(2000) body!: string;
}

export class UpdateMerchantProfileDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) fullName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @ApiPropertyOptional({ enum: ['ar', 'en'] })
  @IsOptional() @IsIn(['ar', 'en']) locale?: string;
}

export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) businessName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(150) contactName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() contactEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(400) defaultPickupAddress?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() defaultBranchId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) invoiceVatNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) invoiceAddress?: string;
  @ApiPropertyOptional({ enum: ['ar', 'en'] })
  @IsOptional() @IsIn(['ar', 'en']) language?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() notifyOnStatus?: boolean;
}

export class MerchantReportsQueryDto {
  @ApiPropertyOptional({ enum: ['today', 'yesterday', 'week', 'month', 'custom', 'all'] })
  @IsOptional() @IsIn(['today', 'yesterday', 'week', 'month', 'custom', 'all'])
  preset?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
}

export class MerchantTimeseriesQueryDto extends MerchantReportsQueryDto {
  @ApiPropertyOptional({ enum: ['day', 'hour'] })
  @IsOptional() @IsIn(['day', 'hour']) bucket?: 'day' | 'hour';
}

export class ExportQueryDto extends MerchantReportsQueryDto {
  @ApiPropertyOptional({ enum: ['orders', 'payments', 'cod', 'settlements'] })
  @IsOptional() @IsIn(['orders', 'payments', 'cod', 'settlements']) resource?: string;
}
