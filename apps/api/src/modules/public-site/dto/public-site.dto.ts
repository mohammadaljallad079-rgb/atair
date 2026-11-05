import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Public contact message. Persisted as a real support ticket — never dropped. */
export class PublicContactDto {
  @ApiProperty({ example: 'أحمد العتيبي' })
  @IsString() @IsNotEmpty() @MaxLength(160)
  name!: string;

  @ApiPropertyOptional({ example: 'ahmad@example.com' })
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+966500000000' })
  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @ApiProperty({ example: 'استفسار عن التوصيل داخل الرياض' })
  @IsString() @IsNotEmpty() @MaxLength(200)
  subject!: string;

  @ApiProperty()
  @IsString() @MinLength(10) @MaxLength(2000)
  message!: string;
}

const DOCUMENT_TYPES = [
  'national_id',
  'license',
  'vehicle_registration',
  'insurance',
  'profile_photo',
  'other',
] as const;

/** One document uploaded with a public registration. */
export class PublicDocumentDto {
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
  @IsOptional() @IsString()
  expiresAt?: string;
}

/** Public driver self-registration from the website landing page. */
export class PublicDriverRegistrationDto {
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
  @IsOptional() @IsString() @MaxLength(40)
  licenseNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  vehicleTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  vehiclePlate?: string;

  @ApiPropertyOptional({ minLength: 8, description: 'Password for the driver login account' })
  @IsString() @MinLength(8) @MaxLength(72)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Matches(/^[a-zA-Z0-9._-]{3,40}$/)
  username?: string;

  @ApiPropertyOptional({ type: [PublicDocumentDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PublicDocumentDto)
  documents?: PublicDocumentDto[];
}

/** Public merchant self-registration from the website landing page. */
export class PublicMerchantRegistrationDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(160)
  businessName!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(160)
  ownerName!: string;

  @ApiProperty({ example: '+966500000030' })
  @IsString() @Matches(/^\+?[0-9]{7,15}$/)
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(80)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  commercialReg?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  vatNumber?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(300)
  address?: string;

  @ApiPropertyOptional({ minLength: 8, description: 'Password for the owner login account' })
  @IsString() @MinLength(8) @MaxLength(72)
  password!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @Matches(/^[a-zA-Z0-9._-]{3,40}$/)
  username?: string;

  @ApiPropertyOptional({ type: [PublicDocumentDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PublicDocumentDto)
  documents?: PublicDocumentDto[];
}
