import { Module } from '@nestjs/common';
import { DriverPortalController } from './driver-portal.controller';
import { DriverContextService } from './driver-context.service';
import { DriverAssignmentsService } from './driver-assignments.service';
import { DriverDeliveriesService } from './driver-deliveries.service';
import { DriverProfileService } from './driver-profile.service';

@Module({
  controllers: [DriverPortalController],
  providers: [DriverContextService, DriverAssignmentsService, DriverDeliveriesService, DriverProfileService],
  exports: [DriverContextService],
})
export class DriverPortalModule {}
