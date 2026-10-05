import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/**
 * Wraps successful responses in a uniform envelope so all clients can rely on
 * a single response contract: { success, data, meta? }.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && '__paginated' in (data as any)) {
          const { items, meta } = data as any;
          return { success: true, data: items, meta };
        }
        return { success: true, data };
      }),
    );
  }
}
