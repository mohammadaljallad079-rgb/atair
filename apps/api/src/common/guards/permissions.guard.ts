import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthUser } from '../decorators/current-user.decorator';
import { Errors } from '../errors/app-error';

/**
 * Server-side permission enforcement. Never trusts role names sent by clients;
 * permissions are derived from the authenticated user's resolved session.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<{ permissions: string[]; mode: 'all' | 'any' }>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.permissions.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    if (!user) throw Errors.unauthorized();

    // Platform admins bypass tenant-level permission checks.
    if (user.isPlatformAdmin) return true;

    const granted = new Set(user.permissions);
    const ok =
      required.mode === 'any'
        ? required.permissions.some((p) => granted.has(p))
        : required.permissions.every((p) => granted.has(p));

    if (!ok) throw Errors.forbidden();
    return true;
  }
}
