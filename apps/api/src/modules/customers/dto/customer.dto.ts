import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class CreateCustomerDto {
  @ApiProperty({ example: 'محمد أحمد' })
  @IsString() @IsNotEmpty() @MaxLength(160)
  fullName!: string;

  @ApiProperty({ example: '+966500000010' })
  @IsString() @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be a valid phone number' })
  phone!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {
  @ApiPropertyOptional({ enum: ['active', 'blocked', 'inactive'] })
  @IsOptional() @IsIn(['active', 'blocked', 'inactive'])
  status?: 'active' | 'blocked' | 'inactive';
}

export class CustomerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['active', 'blocked', 'inactive'] })
  @IsOptional() @IsIn(['active', 'blocked', 'inactive'])
  status?: string;
}

export class CreateCustomerAddressDto {
  @ApiPropertyOptional({ default: 'home' })
  @IsOptional() @IsString() label?: string;

  @ApiProperty()
  @IsString() @IsNotEmpty() address!: string;

  @ApiPropertyOptional()
  @IsOptional() latitude?: number;

  @ApiPropertyOptional()
  @IsOptional() longitude?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString() details?: string;
}
