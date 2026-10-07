import { ValidationPipe } from '@nestjs/common';
import { MerchantsController } from '../../modules/merchants/merchants.controller';
import { MerchantPortalController } from '../../modules/merchant-portal/merchant-portal.controller';
import { UsersController } from '../../modules/users/users.controller';
import { VehiclesController } from '../../modules/vehicles/vehicles.controller';
import { ZonesController } from '../../modules/zones/zones.controller';

/**
 * Regression: update endpoints previously declared their body as the built-in
 * `Partial<X>`, which erases to `Object` in emitted decorator metadata. NestJS
 * skips validation whenever the metatype is a built-in type, so those PATCH
 * bodies were unvalidated and every extra key was mass-assignable. The fix uses
 * `PartialType(X)`, which keeps a real class as the metatype.
 *
 * These tests assert the runtime contract (metatype + ValidationPipe outcome),
 * not an implementation detail, so they fail if anyone reintroduces `Partial<>`.
 */
const PARAM_TYPES = 'design:paramtypes';

/** The DTO is the 3rd parameter: (user, id, dto, ip). */
function bodyMetatype(controller: new (...args: any[]) => unknown, method: string): any {
  const params: unknown[] | undefined = Reflect.getMetadata(PARAM_TYPES, controller.prototype, method);
  return params?.[2];
}

const UPDATE_ENDPOINTS = [
  { name: 'vehicles.update', controller: VehiclesController, method: 'update', valid: { plateNumber: 'ABC-1234' } },
  { name: 'merchants.update', controller: MerchantsController, method: 'update', valid: { name: 'Merchant' } },
  { name: 'zones.update', controller: ZonesController, method: 'update', valid: { name: 'Zone' } },
  { name: 'users.updateRole', controller: UsersController, method: 'updateRole', valid: { name: 'Role' } },
  { name: 'merchant-portal.updateBranch', controller: MerchantPortalController, method: 'updateBranch', valid: { name: 'Branch' } },
];

describe('update body metatype (ValidationPipe gate)', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: false },
  });

  it.each(UPDATE_ENDPOINTS)('$name declares a real DTO metatype (not Object)', ({ controller, method }) => {
    const metatype = bodyMetatype(controller, method);
    expect(metatype).toBeDefined();
    expect(metatype).not.toBe(Object);
  });

  it.each(UPDATE_ENDPOINTS)('$name rejects unknown body keys instead of mass-assigning', async ({ controller, method, valid }) => {
    const metatype = bodyMetatype(controller, method);
    await expect(
      pipe.transform({ ...valid, isActive: true, injectedField: 'evil' }, { type: 'body', metatype }),
    ).rejects.toBeDefined();
  });
});
