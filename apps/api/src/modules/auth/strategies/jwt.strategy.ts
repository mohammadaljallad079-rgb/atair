import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthUser } from '../../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  sid: string;
  roles: string[];
  permissions: string[];
  isPlatformAdmin: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.accessSecret')!,
    });
  }

  /**
   * The access token already carries the server-resolved tenant, roles and
   * permissions. The tenant is therefore taken from the signed token, never
   * from a client-supplied header or body field.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      sessionId: payload.sid,
      isPlatformAdmin: payload.isPlatformAdmin ?? false,
    } as AuthUser;
  }
}
