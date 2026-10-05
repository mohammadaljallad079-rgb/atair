import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from '@atair/db';

export const PERMISSIONS_KEY = 'requiredPermissions';

/**
 * Declares the permission codes required to access a route. Enforced
 * server-side by PermissionsGuard. All listed permissions are required
 * (logical AND) unless `mode: 'any'` is used.
 */
export const RequirePermissions = (
  permissions: PermissionCode[],
  mode: 'all' | 'any' = 'all',
) => SetMetadata(PERMISSIONS_KEY, { permissions, mode });

export const PERMISSIONS_MODE_KEY = 'requiredPermissionsMode';
