import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
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

export class MerchantDocumentInputDto {
  @ApiProperty({ enum: DOCUMENT_TYPES })
  @IsIn(DOCUMENT_TYPES as unknown as string[])
  type!: (typeof DOCUMENT_TYPES)[number];

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(500)
  fileUrl!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(200)
  fileKey?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(60)
  number?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  expiresAt?: string;
}

export class MerchantAccountInputDto {
  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Matches(/^[a-zA-Z0-9._-]{3,40}$/)
  username?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional() @IsString() @MinLength(8) @MaxLength(72)
  password?: string;
}

export class CreateMerchantDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ description: 'Auto-derived from the name when omitted' })
  @IsOptional() @IsString() @MaxLength(80)
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(160)
  ownerName?: string;

  @ApiPropertyOptional({ description: 'Commercial registration number' })
  @IsOptional() @IsString() @MaxLength(40)
  commercialReg?: string;

  @ApiPropertyOptional({ description: 'VAT / tax number' })
  @IsOptional() @IsString() @MaxLength(40)
  vatNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  commissionRate?: number;

  @ApiPropertyOptional({ type: [MerchantDocumentInputDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MerchantDocumentInputDto)
  documents?: MerchantDocumentInputDto[];

  @ApiPropertyOptional({ type: MerchantAccountInputDto })
  @IsOptional() @ValidateNested() @Type(() => MerchantAccountInputDto)
  account?: MerchantAccountInputDto;

  @ApiPropertyOptional({ enum: ['pending', 'approved'] })
  @IsOptional() @IsIn(['pending', 'approved'])
  approvalStatus?: 'pending' | 'approved';
}

export class UpdateMerchantDto extends PartialType(CreateMerchantDto) {
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'suspended'] })
  @IsOptional() @IsIn(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';
}

export class MerchantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'suspended'] })
  @IsOptional() @IsIn(['active', 'inactive', 'suspended'])
  status?: string;

  @ApiPropertyOptional({ enum: ['pending', 'approved', 'rejected', 'suspended'] })
  @IsOptional() @IsIn(['pending', 'approved', 'rejected', 'suspended'])
  approvalStatus?: string;
}

export class RejectMerchantDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ['approved', 'rejected'] })
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  rejectReason?: string;
}

export class SuspendMerchantDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  reason?: string;
}

export class MerchantBranchDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(160)
  name!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(300)
  address!: string;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional() @Type(() => Number) @IsNumber()
  longitude?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;
}
