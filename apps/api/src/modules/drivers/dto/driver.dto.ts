import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateDriverDto {
  @ApiProperty()
  @IsString() @IsNotEmpty() @MaxLength(160)
  fullName!: string;

  @ApiProperty({ example: '+966500000020' })
  @IsString() @Matches(/^\+?[0-9]{7,15}$/)
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  nationalId?: string;
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
