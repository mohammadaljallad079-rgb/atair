import { Global, Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';

/** Shared account provisioning (login user + role link) for drivers/merchants. */
@Global()
@Module({
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
