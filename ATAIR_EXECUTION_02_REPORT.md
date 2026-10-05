# ATAIR_EXECUTION_02_REPORT.md
## عَ الطاير — Execution 02: Admin Control Center

Date: 2026-10-05 · Baseline: `333786d` (Execution 01 — Core Backend)

---

## 1. Outcome

The Admin Control Center (`apps/admin`) is implemented as a production-quality
Next.js 14 App Router application (TypeScript + Tailwind, RTL Arabic with LTR English),
talking to the real NestJS API. It is verified end-to-end in a browser: login →
dashboard → roles → settings → profile, plus the orders list with payment-status filtering.

All repository quality gates pass:

| Gate | Result |
|---|---|
| `npm run typecheck` (api + admin) | PASS |
| `npm run lint` (api + admin) | PASS — 0 warnings |
| `npm run api:test` | 3 suites / 15 tests PASS |
| `npm run -w @atair/admin test` | 5 suites / 20 tests PASS |
| `npm run admin:build` | PASS — 27 routes (25 static) |

## 2. Backend extensions (minimal, additive)

No working module was rewritten. Only aggregation/filter gaps the dashboard genuinely
needed were filled, reusing existing services and keeping tenant isolation, RBAC,
DTO validation, and the response envelope.

- `GET /reports/timeseries?preset|from|to&bucket=day|hour` → `[{bucket, orders, revenue}]`
  (`reports.view`) — chart-ready buckets, no whole-table downloads.
- `GET /reports/operations` → `{unassignedOrders, activeOrders, availableDrivers, busyDrivers, onlineDrivers}`
  (`reports.view`).
- `OrderQueryDto.paymentStatus` filter on `GET /orders`.
- `PaymentQueryDto` (`status`, `method`, `merchantId`, `from`, `to`) on `GET /payments`,
  with related `order`/`customer`/`refunds` included for the admin table.

Tests added: `apps/api/src/modules/reports/reports.range.spec.ts`.

## 3. Admin application

- **Scaffold**: `apps/admin` (`@atair/admin`), Next.js 14.2.15, React 18.3.1, Tailwind,
  port 3001.
- **Design system**: `brand` (orange) + `ink` (blue) token palettes; wordmark «عَ الطاير»
  used as an explicit placeholder (no real logo asset exists in the repo).
- **i18n**: ar/en dictionaries + `translate(locale, key, params)`; direction switches
  ar → RTL / en → LTR.
- **API client** (`src/lib/api.ts`): typed fetch, in-memory access token, refresh token in
  `localStorage` with transparent single-flight refresh and rotation, `onUnauthorized`
  listeners, `ApiError`. `src/lib/endpoints.ts` maps the typed surface; `/users/roles` is
  normalized from `rolePermissions[].permission.code`.
- **Auth**: `AuthProvider` (loading / authenticated / anonymous) + `src/middleware.ts`
  guard (unauthenticated → `/login`, missing permission → `/forbidden`).
- **Components**: app shell (grouped sidebar: Operations / Finance / Communication / Admin),
  `DataTable`, pagination, `FilterBar`, `SearchInput`, `StatusBadge`, `MetricCard`,
  `PageHeader`, empty/loading/error states, confirm dialog, drawer, form fields, money and
  address display, order-status timeline, and lightweight SVG charts (no heavy chart dep).
- **Pages (27 routes)**: dashboard, operations, orders, drivers, dispatch, vehicles, pricing,
  zones, payments, wallets, customers, merchants, support, notifications, audit, users,
  roles, settings, profile, forbidden, login, root redirect.

## 4. Browser verification (authenticated)

- Root `/` redirects (307) → `/login`; login renders RTL Arabic.
- Login `admin@atair.local / ChangeMe123!` (tenant `atair-demo`) → `/dashboard`.
- Dashboard shows grouped Arabic nav, KPI cards, order/revenue charts, currency formatting.
- `/roles` renders the real RBAC matrix (17 roles, 46 permissions grouped by module).
- `/settings` renders the (empty) system-settings state — matches `GET /settings` → `[]`.
- `/profile` renders identity + change-password form.
- `/orders` renders with the new payment-status filter and pagination.

## 5. Runtime configuration notes

- The API runs with global prefix `/api` + URI versioning → routes are `/api/v1/...`;
  health is `GET /api/v1/health`.
- `NEXT_PUBLIC_API_URL` is baked at **build time**. To exercise the admin from a remote
  browser, build with a browser-reachable API origin and run the API with that admin origin
  in `CORS_ORIGINS`.

## 6. Security posture (preserved)

- Tenant comes from the signed JWT only; the frontend never sends a tenant identifier.
- Access token in memory only; refresh token in `localStorage` (documented trade-off — the
  backend uses bearer auth, no CSRF-token support for httpOnly cookies).
- Frontend permission checks are UX only; the API `PermissionsGuard` is the boundary.
- No secrets are rendered; the audit UI relies on server-side redaction.

## 7. Deviations / open items

- **Logo**: no brand asset exists in the repository, so a text wordmark placeholder is used
  via a centralized token layer; the real logo can be dropped in without touching components.
- **Demo data**: the seeded tenant has no orders/settings yet, so list pages correctly show
  empty states.
- Not committed/pushed: changes remain in the working tree on `master` for review.
