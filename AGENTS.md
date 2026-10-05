# عَ الطاير (Al-Tayer) — Agent Notes

Integrated internal transport & last-mile delivery platform. Monorepo (npm workspaces).

## Layout
- `apps/api` — NestJS + Prisma REST API (the only implemented app).
- `apps/admin` — reserved for the Admin web portal (future scope, currently empty).
- `packages/db` — Prisma schema, migrations, seed, and shared `@atair/db` package (exports `PrismaClient` + `PERMISSIONS`).

## Commands (run from repo root)
- Install: `npm install`
- Prisma client: `npm run db:generate`
- Build db package: `npm run -w @atair/db build`
- Migrate: `npm run db:migrate` | Deploy: `npm run db:deploy`
- Seed: `npm run db:seed` (creates platform + `atair-demo` tenants, RBAC, demo users, Riyadh zone/pricing).
- API dev: `npm run api:dev` | Build: `npm run api:build`
- Typecheck: `npm run -w @atair/api typecheck` | Lint: `npm run -w @atair/api lint` | Tests: `npm run api:test`

## API conventions
- Global prefix `/api`, URI versioning (default `v1`) → routes are `/api/v1/...`. Swagger at `/api/docs`.
- Response envelope: success `{ success:true, data, meta? }`; errors `{ success:false, error:{ code, message, details? } }` (see `common/errors/app-error.ts`).
- Global providers (in `app.module.ts`): ThrottlerGuard → JwtAuthGuard → PermissionsGuard; Transform + Audit interceptors; AllExceptionsFilter.
- Tenant comes from the signed JWT (`AuthUser.tenantId`), never from client input. All queries must be tenant-scoped.
- `@Public()` bypasses auth (login/refresh/health). `@RequirePermissions([...])` enforces RBAC; platform admins bypass.
- DTOs use class-validator + `@nestjs/swagger`. ValidationPipe is `whitelist + forbidNonWhitelisted`, so unknown body fields are rejected.

## Prisma gotchas
- Compound unique keys containing a nullable column (e.g. `Role.tenantId_slug`, `VehicleType.tenantId_slug`, `ServiceZone.tenantId_code`) CANNOT be used in `upsert({ where })` when the nullable part is `null`. Use `findFirst` + `update`/`create` instead (see `packages/db/prisma/seed.ts`).
- `@atair/db` resolves in `apps/api` via `tsconfig.paths` → `../../packages/db/dist/index.d.ts` (declarations only) so `nest build` emits to `apps/api/dist/main.js`. Run `npm run -w @atair/db build` before typechecking/building the API.

## Domain notes
- Pricing is rule-driven from the DB (`PricingService` + `PricingEngine`); no hardcoded fares. Rules can be scoped by zone/merchant/vehicleType. Orders resolve the pickup service zone (polygon) before quoting.
- Order status is enforced by `OrderStateMachine` (single source of truth). Transition endpoint body field is `status` (not `to`).
- Driver wallet is credited on payment settlement (`PaymentsService.markPaid` → `WalletsService.creditForOrder`), idempotent per `order:<id>` reference.

## Local env
- Copy `apps/api/.env.example` → `apps/api/.env`; `packages/db/.env` holds `DATABASE_URL`.
- Postgres runs in Docker container `atair-postgres` (host port 5432).
