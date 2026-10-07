import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
