import { Module } from '@nestjs/common';
import { DriverPortalController } from './driver-portal.controller';
import { DriverContextService } from './driver-context.service';
import { DriverAssignmentsService } from './driver-assignments.service';

@Module({
  controllers: [DriverPortalController],
  providers: [DriverContextService, DriverAssignmentsService],
  exports: [DriverContextService],
})
export class DriverPortalModule {}
