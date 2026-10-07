import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

export class SetSettingBody {
  @ApiProperty({ description: 'Any JSON-serialisable value' })
  @IsDefined()
  value!: unknown;
}
