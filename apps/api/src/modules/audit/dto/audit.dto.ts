import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Inclusive lower bound (ISO date)' })
  @IsOptional() @IsString()
  from?: string;

  @ApiPropertyOptional({ description: 'Inclusive upper bound (ISO date)' })
  @IsOptional() @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  userId?: string;
}

export class SecurityEventQueryDto extends AuditQueryDto {
  @ApiPropertyOptional({ enum: ['info', 'low', 'medium', 'high', 'critical'] })
  @IsOptional() @IsIn(['info', 'low', 'medium', 'high', 'critical'])
  severity?: string;
}
