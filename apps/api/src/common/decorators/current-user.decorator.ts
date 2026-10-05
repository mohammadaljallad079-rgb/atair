import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthUser {
  userId: string;
  tenantId: string;
  email?: string | null;
  phone?: string | null;
  fullName: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  isPlatformAdmin: boolean;
  /** Merchants the user belongs to, resolved from MerchantUser at login. */
  merchantIds: string[];
}

/** Injects the authenticated user resolved from the verified access token. */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext): any => {
    const req = ctx.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;
    return data ? user?.[data] : user;
  },
);
