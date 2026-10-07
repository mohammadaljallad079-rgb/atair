import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { configuration } from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { MerchantBoundaryGuard } from './common/guards/merchant-boundary.guard';
import { CustomerBoundaryGuard } from './common/guards/customer-boundary.guard';

import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { UsersModule } from './modules/users/users.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { ZonesModule } from './modules/zones/zones.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SupportModule } from './modules/support/support.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { HealthModule } from './modules/health/health.module';
import { MerchantPortalModule } from './modules/merchant-portal/merchant-portal.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,

    // Domain modules
    AuthModule,
    AuditModule,
    UsersModule,
    CustomersModule,
    DriversModule,
    VehiclesModule,
    MerchantsModule,
    ZonesModule,
    PricingModule,
    OrdersModule,
    DispatchModule,
    TrackingModule,
    PaymentsModule,
    WalletsModule,
    NotificationsModule,
    SupportModule,
    ReportsModule,
    SettingsModule,
    HealthModule,
    MerchantPortalModule,
    CustomerPortalModule,
  ],
  providers: [
    // Order matters: throttle → authenticate → merchant boundary → authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MerchantBoundaryGuard },
    { provide: APP_GUARD, useClass: CustomerBoundaryGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
