export interface AppConfig {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtl: string;
  };
  security: {
    maxFailedLogins: number;
    lockoutMinutes: number;
    bcryptRounds: number;
  };
  corsOrigins: string[];
}

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing required environment variable: ${name}`);
  return v;
}

export const configuration = (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: required('DATABASE_URL'),
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret-change-me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  security: {
    maxFailedLogins: parseInt(process.env.MAX_FAILED_LOGINS ?? '5', 10),
    lockoutMinutes: parseInt(process.env.LOCKOUT_MINUTES ?? '15', 10),
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10),
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3001').split(',').map((s) => s.trim()),
});
