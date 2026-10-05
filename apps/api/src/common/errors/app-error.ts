import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain error with a stable machine-readable code. Every API error response
 * uses the same shape: { success: false, error: { code, message, details? } }.
 */
export class AppError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

export const Errors = {
  validation: (message = 'Validation failed', details?: unknown) =>
    new AppError('VALIDATION_ERROR', message, HttpStatus.UNPROCESSABLE_ENTITY, details),
  unauthorized: (message = 'Authentication required') =>
    new AppError('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED),
  invalidCredentials: () =>
    new AppError('INVALID_CREDENTIALS', 'Invalid email/phone or password', HttpStatus.UNAUTHORIZED),
  forbidden: (message = 'You do not have permission to perform this action') =>
    new AppError('FORBIDDEN', message, HttpStatus.FORBIDDEN),
  notFound: (entity: string, message?: string) =>
    new AppError(`${entity.toUpperCase()}_NOT_FOUND`, message ?? `${entity} not found`, HttpStatus.NOT_FOUND),
  conflict: (code: string, message: string) =>
    new AppError(code, message, HttpStatus.CONFLICT),
  tooManyRequests: (message = 'Too many requests') =>
    new AppError('RATE_LIMITED', message, HttpStatus.TOO_MANY_REQUESTS),
  accountLocked: () =>
    new AppError('ACCOUNT_LOCKED', 'Account temporarily locked due to failed login attempts', HttpStatus.TOO_MANY_REQUESTS),
  accountSuspended: () =>
    new AppError('ACCOUNT_SUSPENDED', 'Account is suspended', HttpStatus.FORBIDDEN),
  invalidTransition: (from: string, to: string) =>
    new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition order from "${from}" to "${to}"`,
      HttpStatus.CONFLICT,
    ),
  internal: (message = 'Internal server error') =>
    new AppError('INTERNAL_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR),
};

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
