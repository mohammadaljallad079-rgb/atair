# عَ الطاير (Al-Tayer) — Agent Notes

Integrated internal transport & last-mile delivery platform. Monorepo (npm workspaces).

## Layout
- `apps/api` — NestJS + Prisma REST API.
- `apps/admin` — Admin Control Center: Next.js 14 App Router + TS + Tailwind, RTL Arabic (LTR English), dev/start port **3001**. Wordmark «عَ الطاير» is an intentional placeholder (no real logo asset exists in the repo).
- `apps/merchant` — Merchant / Business Portal: Next.js 14 App Router + TS + Tailwind, RTL Arabic (LTR English), dev/start port **3002**. Consumes only `/api/v1/merchant/*` (plus `/auth/*`); a pure merchant principal is blocked from tenant-wide routes by `MerchantBoundaryGuard`.
- `packages/db` — Prisma schema, migrations, seed, and shared `@atair/db` package (exports `PrismaClient` + `PERMISSIONS`).

## Commands (run from repo root)
- Install: `npm install`
- Prisma client: `npm run db:generate`
- Build db package: `npm run -w @atair/db build`
- Migrate: `npm run db:migrate` | Deploy: `npm run db:deploy`
- Seed: `npm run db:seed` (creates platform + `atair-demo` tenants, RBAC, demo users, Riyadh zone/pricing).
- API dev: `npm run api:dev` | Build: `npm run api:build`
- Typecheck (both apps): `npm run typecheck` | Lint (both apps): `npm run lint`
- API tests: `npm run api:test` | Admin tests: `npm run -w @atair/admin test` | Merchant tests: `npm run -w @atair/merchant test`
- Admin dev: `npm run admin:dev` | Admin build: `npm run admin:build`
- Merchant dev: `npm run merchant:dev` | Merchant build: `npm run merchant:build`

## Admin app (apps/admin)
- Next.js App Router under `src/app`; shared UI in `src/components`, API client in `src/lib`.
- `src/lib/api.ts` — typed fetch client; access token held **in memory only**, refresh token in `localStorage` (`SESSION_FLAG`), transparent single-flight refresh, `onUnauthorized` listeners, `ApiError`.
- `src/lib/endpoints.ts` — typed endpoint map; `src/lib/types.ts` — hand-written domain types (note: `/users/roles` returns `rolePermissions[].permission.code`, normalized in endpoints).
- `src/i18n/dictionary.ts` — ar/en dictionaries + `translate(locale, key, params)`; direction from locale (ar → RTL).
- `src/middleware.ts` — auth guard; unauthenticated → `/login`, missing permission → `/forbidden`.
- Brand tokens in `tailwind.config.ts`: `brand` (orange) + `ink` (blue) palettes.
- `NEXT_PUBLIC_API_URL` is baked in at **build time**; changing it requires a rebuild (`npm run admin:build`). Set it to the browser-reachable API URL (not `localhost` from a remote browser).
- Frontend permission checks are UX only — the API `PermissionsGuard` remains the security boundary.

## Merchant app (apps/merchant)
- Same Next.js App Router structure as the admin app (`src/app`, `src/components`, `src/lib`, `src/i18n`); portal pages live under `src/app/(portal)/*` behind `(portal)/layout.tsx`.
- API surface is `/api/v1/merchant/*` only (see `src/lib/endpoints.ts`). The merchant is resolved from the JWT — never sent by the client.
- `src/middleware.ts` gates on the non-sensitive `atair.session` presence flag; the access token stays in memory, refresh token in `localStorage` (`atair.refreshToken`).
- Charts in `src/components/charts/charts.tsx` use the brand colors `#f97316` (orange) and `#2563eb` (ink blue).

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
- Reports extras (added for the Admin dashboard, all `reports.view`): `GET /reports/timeseries?preset|from|to&bucket=day|hour` → `[{bucket, orders, revenue}]`; `GET /reports/operations` → `{unassignedOrders, activeOrders, availableDrivers, busyDrivers, onlineDrivers}`.
- List filters: `GET /orders` accepts `paymentStatus`; `GET /payments` accepts `status`, `method`, `merchantId`, `from`, `to` (plus pagination/search).
- Pricing is rule-driven from the DB (`PricingService` + `PricingEngine`); no hardcoded fares. Rules can be scoped by zone/merchant/vehicleType. Orders resolve the pickup service zone (polygon) before quoting.
- Order status is enforced by `OrderStateMachine` (single source of truth). Transition endpoint body field is `status` (not `to`).
- Driver wallet is credited on payment settlement (`PaymentsService.markPaid` → `WalletsService.creditForOrder`), idempotent per `order:<id>` reference.

## Local env
- Copy `apps/api/.env.example` → `apps/api/.env`; `packages/db/.env` holds `DATABASE_URL`.
- Postgres runs in Docker container `atair-postgres` (host port 5432).
