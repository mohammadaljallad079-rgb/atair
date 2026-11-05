import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

const DOCUMENT_TYPES = [
  'national_id',
  'license',
  'vehicle_registration',
  'insurance',
  'profile_photo',
  'other',
] as const;

/** One uploaded identity/vehicle document supplied with a registration. */
export class DriverDocumentInputDto {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES as unknown as string[])
  type!: (typeof DOCUMENT_TYPES)[number];

  @ApiProperty({ description: 'Stored file URL/key for the uploaded document' })
  @IsString() @IsNotEmpty() @MaxLength(500)
  fileUrl!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  fileKey?: string;

  @ApiPropertyOptional({ description: 'Document number (e.g. national id / license number)' })
  @IsOptional() @IsString() @MaxLength(60)
  number?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  expiresAt?: string;
}

/** Optional login credentials created alongside a driver record. */
export class DriverAccountInputDto {
  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Login username (also accepts email or phone)' })
  @IsOptional() @IsString() @Matches(/^[a-zA-Z0-9._-]{3,40}$/)
  username?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional() @IsString() @MinLength(8) @MaxLength(72)
  password?: string;
}

export class CreateDriverDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(160)
  fullName!: string;

  @ApiProperty({ example: '+966500000020' })
  @IsString() @Matches(/^\+?[0-9]{7,15}$/)
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  nationalId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  nationalIdExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  licenseExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(60)
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(400)
  address?: string;

  @ApiPropertyOptional({ description: 'Operating service zone' })
  @IsOptional() @IsUUID()
  zoneId?: string;

  @ApiPropertyOptional({ enum: ['full_time', 'part_time', 'freelance', 'contract'] })
  @IsOptional() @IsIn(['full_time', 'part_time', 'freelance', 'contract'])
  employmentType?: string;

  @ApiPropertyOptional({ enum: ['economy', 'express', 'premium', 'cargo'] })
  @IsOptional() @IsIn(['economy', 'express', 'premium', 'cargo'])
  classification?: string;

  @ApiPropertyOptional({ description: 'Vehicle type for the driver vehicle' })
  @IsOptional() @IsString()
  vehicleTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  vehiclePlate?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(60)
  vehicleMake?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(60)
  vehicleModel?: string;

  @ApiPropertyOptional({ type: [DriverDocumentInputDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => DriverDocumentInputDto)
  documents?: DriverDocumentInputDto[];

  @ApiPropertyOptional({ type: DriverAccountInputDto, description: 'Creates a driver login account' })
  @IsOptional() @ValidateNested() @Type(() => DriverAccountInputDto)
  account?: DriverAccountInputDto;

  @ApiPropertyOptional({ enum: ['pending', 'approved'] })
  @IsOptional() @IsIn(['pending', 'approved'])
  approvalStatus?: 'pending' | 'approved';
}

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @ApiPropertyOptional({ enum: ['offline', 'online', 'busy', 'paused', 'suspended'] })
  @IsOptional() @IsIn(['offline', 'online', 'busy', 'paused', 'suspended'])
  status?: 'offline' | 'online' | 'busy' | 'paused' | 'suspended';

  @ApiPropertyOptional({ enum: ['pending', 'verified', 'rejected', 'expired'] })
  @IsOptional() @IsIn(['pending', 'verified', 'rejected', 'expired'])
  verificationStatus?: 'pending' | 'verified' | 'rejected' | 'expired';

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isAvailable?: boolean;
}

export class DriverQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['offline', 'online', 'busy', 'paused', 'suspended'] })
  @IsOptional() @IsIn(['offline', 'online', 'busy', 'paused', 'suspended'])
  status?: string;

  @ApiPropertyOptional({ enum: ['pending', 'verified', 'rejected', 'expired'] })
  @IsOptional() @IsIn(['pending', 'verified', 'rejected', 'expired'])
  verificationStatus?: string;

  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'suspended'] })
  @IsOptional() @IsIn(['pending', 'approved', 'rejected', 'suspended'])
  approvalStatus?: string;
}

export class UpdateDriverLocationDto {
  @ApiProperty()
  @Type(() => Number) @IsNumber() @IsLatitude()
  latitude!: number;

  @ApiProperty()
  @Type(() => Number) @IsNumber() @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  heading?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  speed?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  accuracy?: number;
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  rejectReason?: string;
}

export class RejectDriverDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}
