# ATAIR_EXECUTION_02_AUDIT.md
## عَ الطاير — Admin Control Center: Repository & API Audit

Date: 2026-10-05
Auditor: OpenHands agent
Baseline commit: `333786d` (EXECUTION 01) — working tree clean at start.

---

## 1. Current repository state

Monorepo (npm workspaces), `workspaces: ["apps/*", "packages/*"]`.

```
apps/api       NestJS 10 + Prisma 5 + PostgreSQL — REAL, complete (17 modules)
apps/admin     EMPTY directory — no package.json, no source
packages/db    Prisma schema + migrations + seed + shared @atair/db
```

- Root `package.json` already declares `admin:dev`, `admin:build`, `lint`, `typecheck`,
  `build` scripts that reference `@atair/admin` (workspace name expected).
- `apps/admin` genuinely empty → we create a production-quality Next.js app from scratch.

### Runtime environment
- Node v24.21.0, npm 11.19.1.
- PostgreSQL runs in Docker container `atair-postgres` (port 5432). In this fresh
  environment the container was absent; recreated with matching credentials
  (`atair/atair_dev_pw`, db `atair`) and `prisma migrate deploy` + `db:seed` re-run.
- API runs at `http://localhost:3000`, base path `/api`, versioned `/api/v1/...`.
  Swagger at `/api/docs`. CORS default origin `http://localhost:3001` (admin port).

---

## 2. Available APIs (source of truth)

All routes are under `/api/v1`. Every response uses the envelope:

- success: `{ "success": true, "data": <T>, "meta?": {...} }`
- error:   `{ "success": false, "error": { "code", "message", "details?" } }`

Paginated list endpoints return `data: T[]` + `meta: { page, pageSize, total, totalPages }`.

### Auth (`/auth`)
| Method | Path | Perm | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | body `{identifier, password, tenantSlug?}` → `{user, accessToken, refreshToken, expiresIn}` |
| POST | `/auth/refresh` | public | body `{refreshToken}` → rotated `{accessToken, refreshToken, expiresIn, userId}` |
| POST | `/auth/logout` | bearer | revokes current session |
| GET  | `/auth/me` | bearer | returns `AuthUser` |
| POST | `/auth/change-password` | bearer | |
| POST | `/auth/forgot-password` / `/auth/reset-password` | public | |

`user` object from login/me: `{ id, fullName, email, phone, tenantId, tenantSlug, roles[], permissions[] }`.

### Users / RBAC (`/users`)
| Method | Path | Perm |
|---|---|---|
| GET | `/users` | `users.view` (paginated, search) |
| GET | `/users/roles` | `users.view` |
| GET | `/users/permissions` | `users.manage_roles` |
| GET | `/users/:id` | `users.view` |
| POST | `/users` | `users.create` (body `{fullName,email?,phone?,password,roleSlugs[],branchId?}`) |
| PATCH | `/users/:id` | `users.update` (`{fullName?,email?,phone?,status?,roleSlugs?}`) |

### Customers (`/customers`)
`GET /customers` (`customers.view`; search + `status` filter), `GET /customers/:id`,
`POST /customers` (`customers.create`), `PATCH /customers/:id` (`customers.update`),
`GET /customers/:id/addresses`, `POST /customers/:id/addresses`.

### Drivers (`/drivers`)
`GET /drivers` (`drivers.view`; search, `status`, `verificationStatus`), `GET /drivers/locations`
(`tracking.view`), `GET /drivers/:id`, `POST /drivers` (`drivers.create`),
`PATCH /drivers/:id` (`drivers.update`), `POST /drivers/:id/suspend` (`drivers.suspend`),
`POST /drivers/:id/location` (`tracking.view`),
`POST /drivers/:id/documents/:documentId/review` (`drivers.verify`),
`POST /drivers/:id/vehicle/:vehicleId` (`drivers.update`).

### Vehicles (`/vehicles`)
`GET /vehicles/types`, `GET /vehicles`, `POST /vehicles` (`vehicles.manage`), `PATCH /vehicles/:id`.

### Merchants (`/merchants`)
`GET /merchants`, `GET /merchants/:id`, `POST /merchants` (`merchants.manage`),
`PATCH /merchants/:id`, `POST /merchants/:id/branches`.

### Orders (`/orders`)
`GET /orders` (`orders.view`; search, `status` incl. virtual `active`, `customerId`, `driverId`,
`merchantId`, `from`, `to`), `GET /orders/:id`, `GET /orders/:id/timeline`,
`POST /orders` (`orders.create`), `PATCH /orders/:id` (`orders.update`),
`POST /orders/:id/transition` (`orders.update`; body `{status, reason?}` — validated by OrderStateMachine),
`POST /orders/:id/assign` (`orders.assign`; `{driverId, vehicleId?, force?}`),
`POST /orders/:id/cancel` (`orders.cancel`).

Order detail includes items, statusHistory, assignments, deliveryAddress, deliveryAttempts,
deliveryProofs, payments, customer, driver, merchant.

### Dispatch (`/dispatch`)
`GET /dispatch/orders/:orderId/offers` (`dispatch.view`),
`POST /dispatch/orders/:orderId/redispatch` (`dispatch.manage`).

### Tracking (`/tracking`)
`GET /tracking/live` (`tracking.view`) → `{activeOrders[], drivers[{id,fullName,status,location}]}`,
`GET /tracking/orders/:id` (`tracking.view`).

### Pricing (`/pricing`)
`GET /pricing/rules`, `POST /pricing/rules`, `PATCH /pricing/rules/:id` (`pricing.manage`),
`POST /pricing/quote` (`pricing.view`) — real server-side quote.

### Zones (`/zones`)
`GET /zones`, `POST /zones`, `PATCH /zones/:id` (`zones.manage`), `GET /zones/resolve?lat&lng`.

### Payments (`/payments`)
`GET /payments` (`payments.view`), `POST /payments` (`payments.manage`),
`POST /payments/:id/mark-paid` (`payments.manage`), `POST /payments/:id/refund` (`payments.refund`).

### Wallets (`/wallets`)
`GET /wallets`, `GET /wallets/driver/:driverId` (`wallets.view`),
`POST /wallets/driver/:driverId/adjust` (`wallets.manage`).

### Notifications (`/notifications`)
`GET /notifications`, `POST /notifications/:id/read` (`notifications.view`).

### Support (`/support`)
`GET /support/tickets`, `GET /support/tickets/:id`, `POST /support/tickets`,
`POST /support/tickets/:id/messages`, `PATCH /support/tickets/:id/status`.

### Reports (`/reports`)
`GET /reports/dashboard` (`reports.view`; `preset` = today|yesterday|week|month|custom, `from`, `to`)
→ `{orders{total,active,pending,completed,cancelled}, drivers{online,busy}, finance{revenue,driverEarnings,platformCommission,pendingPayments}, range{from,to}}`,
`GET /reports/orders-by-status` → `[{status, count}]`.

### Audit (`/audit`)
`GET /audit/activity`, `GET /audit/api-logs`, `GET /audit/security-events` (`audit.view`; paginated, search).
Server-side redaction already strips passwords/tokens/secrets before persistence.

### Settings (`/settings`)
`GET /settings` (`settings.view`), `PUT /settings/:key` (`settings.manage`).

### Health
`GET /health` (public) → `{status, database, timestamp, uptimeSeconds}`.

---

## 3. Authentication flow (verified)

1. `POST /auth/login` with `{identifier, password, tenantSlug}`.
2. Returns a short-lived **access token** (default 15m, JWT HS256) + opaque **refresh token** (30d).
3. Access token payload carries `sub, tenantId, sid, roles[], permissions[], isPlatformAdmin`.
4. **Tenant context is taken from the signed JWT only** — never from a client header/body.
5. `POST /auth/refresh` rotates: old session revoked, new access+refresh pair issued.
6. `POST /auth/logout` revokes the current session; suspended/locked users are rejected.

## 4. RBAC

- 46 permissions, 17 roles (`packages/db/src/permissions.ts` is the single source of truth).
- `PermissionsGuard` (server) is authoritative; `platform_admin` bypasses checks.
- Frontend permission checks will be **UX only** (hide/disable), never the security boundary.

## 5. Seed data (development only)

| Identifier | Password | Tenant | Role |
|---|---|---|---|
| `root@atair.local` | `ChangeMe123!` | `atair-platform` | platform_admin |
| `admin@atair.local` | `ChangeMe123!` | `atair-demo` | tenant_admin |
| `dispatcher@atair.local` | `ChangeMe123!` | `atair-demo` | dispatcher |

Also seeds 4 global vehicle types, a Riyadh service zone, "Default Riyadh Pricing" rule,
and notification templates. Demo customers/drivers/orders created during EXECUTION 01 testing.

---

## 6. Genuine gaps vs. Admin requirements

Assessed against the brief. Backend is strong; only these are genuinely missing for a
dashboard that must not download whole tables:

1. **Dashboard time-series** (orders/revenue over time) — no endpoint exists.
   The current dashboard returns point-in-time counts + range aggregates only.
2. **Operations summary** — `/tracking/live` returns active orders + online/busy drivers,
   but not unassigned counts / available-driver counts as aggregates.
3. **Payment list filters** — `GET /payments` supports pagination + search only
   (no `status`/`method`/`merchantId`/date filters).
4. **Order payment-status filter** — `OrderQueryDto` has no `paymentStatus`.
5. **Merchant detail branches** — `GET /merchants/:id` includes branches; OK.
6. **Wallet list** includes driver identity; OK.

Decision: add **minimal, well-designed** aggregation/filter extensions to `apps/api`
(reusing services, keeping `/api/v1`, DTO validation, permission checks, tenant isolation,
audit where relevant, Swagger, and tests). No working module is rewritten.

### Backend additions planned
- `GET /reports/timeseries?preset|from|to&bucket=day|hour` → `[{bucket, orders, revenue}]`.
- `GET /reports/operations` → `{unassignedOrders, activeOrders, availableDrivers, busyDrivers, onlineDrivers}`.
- Extend `PaymentQueryDto` with `status`, `method`, `merchantId`, `from`, `to` (tenant-scoped).
- Extend `OrderQueryDto` with `paymentStatus`.

---

## 7. Reusable frontend components (to build)

Design-token layer (orange + blue), i18n (ar/en with RTL/LTR), typed API client with refresh,
auth provider, `PermissionGate`, app shell, `DataTable`/`Pagination`/`FilterBar`/`SearchInput`,
`StatusBadge`/`MetricCard`/`PageHeader`/`EmptyState`/`LoadingState`/`ErrorState`/`ConfirmDialog`/
`Drawer`/`FormField`/`DateRangePicker`/`MoneyDisplay`/`AddressDisplay`/`OrderStatusTimeline`,
and lightweight SVG charts (no heavy chart framework).

## 8. Branding / assets

No logo or brand files exist anywhere in the repository or attachments. Per the brief we do
**not invent** a replacement logo: we use a clean text wordmark «عَ الطاير» as an explicitly
documented placeholder, with a centralized token/logo layer so the real asset can be dropped in
without touching components.

---

## 9. Implementation plan

1. Scaffold `apps/admin` (Next.js 14 App Router, TS, Tailwind, `@atair/admin`), port 3001.
2. Backend extensions (section 6) + tests.
3. Theme tokens + i18n dictionary + `dir` switching.
4. Typed API client + auth provider (in-memory access token, refresh via httpOnly-less storage
   policy documented; refresh-token rotation handled) + permission context.
5. App shell + common components + charts.
6. Feature pages (dashboard, operations, orders, drivers, customers, merchants, vehicles,
   dispatch, pricing, payments, wallets, zones, support, notifications, audit, users, roles,
   settings, forbidden).
7. Tests (jest + React Testing Library), quality gates, browser verification.
8. `ATAIR_EXECUTION_02_REPORT.md`, update `AGENTS.md`, local commit (no push).

---

## 10. Security posture to preserve

- Tenant from JWT only; every admin request is tenant-scoped by the backend.
- Frontend never sends `tenant_id`.
- Access token kept in memory only; refresh token in `localStorage` with documented trade-off
  (no httpOnly cookie possible without backend CSRF token support — backend uses bearer auth).
- Never render secrets; audit UI relies on server-side redaction.
- Hidden UI ≠ authorization; direct API calls remain protected.
