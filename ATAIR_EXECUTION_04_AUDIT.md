# ATAIR — EXECUTION 04 AUDIT
## Real Customer Application — Pre-implementation audit

**Repository:** https://github.com/mohammadaljallad079-rgb/atair
**Starting branch:** `main`
**Starting commit:** `c39cb0192cac6edce9072c522d2c14ca8c33ce22`
**Audit date:** 2026-10-06

This document records the *actual* state of the platform before building the
Customer Application (Execution 04). It is derived from reading the real
source, Prisma schema, guards and services — not from assumptions.

---

## 1. Repository layout (verified)

```
apps/api        → NestJS + Prisma REST API (v1, /api/v1/*)
apps/admin      → Next.js 14 Admin Control Center (port 3001)
apps/merchant   → Next.js 14 Merchant Portal (port 3002)
packages/db     → Prisma client, schema, migrations, seed, RBAC catalog
public/assets/brand → official عَ الطاير brand assets (source + derivatives)
```

No `apps/customer` exists. npm workspaces are `apps/*`, `packages/*`.

---

## 2. Existing customer-related backend capabilities

### 2.1 Data model (Prisma)

| Model | Purpose | Customer relevance |
|---|---|---|
| `Customer` | `fullName, phone, email?, status, rating?, notes?, tenantId, merchantId?, userId?` | **The customer record.** `userId` links an optional login `User`. `merchantId` set when the customer belongs to a merchant directory. |
| `CustomerAddress` | `label, address, latitude?, longitude?, details?, isDefault` | Saved addresses. |
| `CustomerPreference` | `key/value` JSON per customer | Preferences (not yet used by a portal). |
| `Order` | full lifecycle, pricing fields, `customerId?`, `createdByUserId?` | Customer orders. |
| `OrderStatusHistory` | `fromStatus/toStatus/reason/meta/createdAt` | Status timeline. |
| `OrderAssignment` | driver offers/acceptance | Driver assignment records. |
| `DeliveryAddress` | per-order pickup/dropoff with contact | Recipient/pickup details. |
| `Payment` / `PaymentTransaction` / `Refund` | payments | Payment records. |
| `Notification` | `userId?, customerId?, title, body, status, readAt` | In-app notification center. |
| `SupportTicket` / `TicketMessage` | `customerId?, merchantId?, orderId?` | Customer support. |
| `Driver` / `DriverLocation` | driver profile + last known location | Tracking (real, if present). |

**Critical gap:** `Customer.userId` exists but is **never populated or queried
anywhere** in the codebase. There is no link between a logged-in `User` and a
`Customer` row, and no endpoint that resolves "the customer behind this login".

### 2.2 Auth model

- `POST /api/v1/auth/login` (identifier = email or phone + password, optional `tenantSlug`).
- `POST /api/v1/auth/refresh` (rotating single-use refresh token, hashed in `Session`).
- `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`, `POST /api/v1/auth/change-password`,
  `forgot-password`, `reset-password`.
- JWT access token carries `sub, tenantId, sid, roles, permissions, isPlatformAdmin, merchantIds`.
  **Identity/tenant/roles come from the signed token — never from the client.**
- **No registration endpoint exists.** Users are created by seed or by admin/merchant flows.
- Roles/permissions are resolved server-side from `UserRole → Role → RolePermission`.

The `customer` role exists in the RBAC catalog:
```
customer: { permissions: [orders.view, tracking.view, payments.view] }
```

### 2.3 Guards (global, in order)

`ThrottlerGuard → JwtAuthGuard → MerchantBoundaryGuard → PermissionsGuard`

- `JwtAuthGuard` — authenticates unless `@Public()`.
- `MerchantBoundaryGuard` — restricts **merchant-only** principals (all roles are
  `merchant_*`) to `/api/v1/merchant/*`, `/api/v1/auth`, `/api/v1/health`.
- `PermissionsGuard` — enforces `@RequirePermissions(...)`; platform admins bypass.

### 2.4 Self-service pattern to mirror

`merchant-portal` (`/api/v1/merchant/*`) is the established self-service
pattern: a **context service** resolves the acting principal from the token,
every query is scoped by that context, and IDOR is impossible because reads are
`findFirst({ id, <ownerColumn> })`. This is the pattern the customer app must
reuse (adapted to `Customer.userId`).

---

## 3. What already exists that the Customer App can reuse

| Capability | Endpoint / service | Reusable? |
|---|---|---|
| Login / refresh / logout / me | `auth` | **Yes, as-is** |
| Server-side pricing engine | `PricingService.quote` (DB rules, no hardcoded fares) | **Yes, via a new scoped endpoint** |
| Order creation engine | `OrdersService.create` (server computes distance, discount, price; rejects `PRICING_UNAVAILABLE`) | **Yes** |
| Order state machine | `OrderStateMachine` (server-enforced transitions) | **Yes** |
| Tracking snapshot | `TrackingService.track` (real status + **real** last `DriverLocation` if present) | **Yes** |
| Notifications | `Notification` model + `NotificationsService.emit` | **Yes** (data exists) |
| Support | `SupportTicket`/`TicketMessage` + `SupportService` | **Yes** (needs customer scoping) |
| Zones | `ZonesService.resolveZone` | **Yes** |

---

## 4. Gaps required for the Customer App

| # | Gap | Severity | Decision |
|---|---|---|---|
| G1 | No `apps/customer` | — | Build it (Next.js 14, App Router, TS, Tailwind, mobile-first). |
| G2 | No customer registration endpoint | High | Add `POST /api/v1/customer/auth/register` that creates `User` (+ `customer` role) **and** a linked `Customer` row atomically. |
| G3 | `Customer.userId` never populated/queried | High | Populate on register; resolve the principal via `Customer.userId = token.sub`. |
| G4 | No customer-scoped self-service endpoints | High | Add a `customer-portal` module mirroring `merchant-portal`. |
| G5 | **Cross-customer IDOR exposure**: `GET /orders` (tenant-wide) and `GET /orders/:id` are protected only by `orders.view`, which the `customer` role holds → a customer token can read **every** order in the tenant. Same for `GET /tracking/orders/:id`, `GET /payments`, `GET /notifications`, `GET /support/tickets` (no customer scoping). | **Critical** | Add a **CustomerBoundaryGuard** that confines customer-only principals to `/api/v1/customer/*`, `/api/v1/auth`, `/api/v1/health` — exactly analogous to `MerchantBoundaryGuard`. Plus per-endpoint ownership checks in the new module. |
| G6 | `Customer` role carries `payments.view` | Medium | Reduce to `[orders.view, tracking.view]`; customer payment visibility is served only through `/customer/*` with ownership checks. |
| G7 | No customer-facing quote/create parity endpoint | High | Add `POST /customer/orders/quote` and `POST /customer/orders` reusing `PricingService`/`OrdersService` with identical inputs, so quote == create. |
| G8 | Customer cancellation rules undefined | Medium | Allow cancellation only from `pending/confirmed/searching_driver/assigned/driver_arriving`; server enforces. |
| G9 | No ratings/reviews table | Low | **Document as future work.** Do not build a subsystem. |
| G10 | No real map/geocoding provider | Medium | **Do not fake it.** Structured address + optional coordinates only. Document limitation. |
| G11 | No real payment gateway | Medium | Support only genuinely implemented methods. `cash`/`cod` are real (COD lifecycle). `wallet` exists as a model but has no customer top-up flow. `card`/`online` have **no gateway** → must be shown as unavailable. |
| G12 | No PWA manifest in existing apps | Low | Add a manifest + official icons for the customer app. |
| G13 | No customer tests | High | Add unit tests + a live-DB ownership (IDOR) matrix. |

---

## 5. Existing order lifecycle (exact, from `order-state.machine.ts`)

```
draft → pending → confirmed → searching_driver → assigned → driver_arriving
      → picked_up → in_transit → arriving → delivered
cancelled / failed_delivery / returned (terminal or branch states)
```
`ACTIVE_STATUSES = pending, confirmed, searching_driver, assigned,
driver_arriving, picked_up, in_transit, arriving`
`TERMINAL = delivered, cancelled, returned`

On create, `OrdersService.create` sets `status: pending` then dispatch moves it
to `searching_driver`. **The customer app must use these exact statuses.**

---

## 6. Pricing flow (verified)

1. Distance is computed **server-side** (`haversineKm`) when coordinates exist;
   client estimates are ignored.
2. Pickup coordinates → `ZonesService.resolveZone` → zone-scoped rules.
3. `PricingService.quote` loads active rules, selects highest priority, returns
   `{ currency, subtotal, surchargeAmount, discountAmount, taxAmount, total,
   breakdown[], ruleId, ruleName }`.
4. If no rule matches → `PRICING_UNAVAILABLE` (HTTP 409). Order creation refuses
   to persist an unpriced order.
5. **Quote and create use the same engine and the same inputs** → parity is
   structural; the customer endpoint must pass identical parameters.

Seeded pricing (demo tenant, Riyadh zone): base 8, distance 1.75/km, time 0.35/min,
night surcharge, COD fee 3. Currency `SAR`.

---

## 7. Payment flow (verified)

- `PaymentMethod = cash | card | wallet | online | bank_transfer | cod`.
- COD lifecycle (`codStatus`: none→pending→collected→settled) is real and
  implemented for delivery-fee vs merchandise separation.
- **No card/online gateway integration exists.** No wallet top-up for customers.
- Therefore the customer app offers **Cash on Delivery** and **Cash** only, and
  marks Card/Online as unavailable — it will not fake a successful card payment.

---

## 8. Tracking capability (verified)

`TrackingService.track(tenantId, orderId)` returns the order's status/coords and
the **latest real `DriverLocation` row** if a driver is assigned. If no location
row exists, `driverLocation` is `null`.

**Limitation:** there is no streaming/live GPS push and no driver app producing
continuous locations in this environment. The customer tracking UI will render
the **real status timeline + real timestamps + real driver assignment** and only
show a location when the backend actually has one. **No simulated movement, no
fake car, no invented coordinates.**

---

## 9. Notification & support capability (verified)

- `Notification` supports `userId` and `customerId`. The order engine emits
  `order.created/assigned/delivered/...` via templates. The customer app will
  list notifications scoped to the customer.
- `SupportTicket` supports `customerId`. The customer app will list/create
  tickets scoped by `customerId` with server-side ownership.

---

## 10. Security model for Execution 04

- **Identity** always from the signed JWT (`sub`), never from the client.
- **Ownership** enforced by `findFirst({ id, customerId })` — an attempt to read
  another customer's resource yields **404**, not the row.
- **Boundary**: `CustomerBoundaryGuard` blocks customer-only principals from the
  tenant-wide Admin API (closes G5).
- **RBAC**: `Customer` role trimmed to `[orders.view, tracking.view]` (G6).
- Regression tests cover: unauthenticated → 401; cross-customer → denied;
  customer → admin/merchant endpoints → 403.

---

## 11. Definition of "real" for this execution

No mock/demo/fake/hardcoded runtime data. Every list, price, order, notification
and ticket shown in the customer app comes from the live API and PostgreSQL.
Test fixtures are permitted **inside tests only**.

---

## 12. Environment (verified)

- Node 24, npm 11, PostgreSQL 16 (started for verification), Prisma migrations
  applied, seed loaded (demo tenant `atair-demo`, Riyadh zone + pricing rule).
- API on 3000, admin 3001, merchant 3002; customer will be 3003.
- All existing gates green at baseline (API 18, Admin 24, Merchant 23).
