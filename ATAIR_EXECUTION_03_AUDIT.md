# ATAIR_EXECUTION_03_AUDIT.md
## عَ الطاير — Execution 03: Merchant / Business Portal — Backend Audit

Baseline: `master` @ `6b239a6` (Execution 02), clean tree, no remote.
Scope of this audit: determine exactly what the existing backend already supports
for merchant workflows, and the minimal, additive extensions required.

---

## 1. Existing merchant schema (packages/db/prisma/schema.prisma)

| Model | Fields (relevant) | Notes |
|---|---|---|
| `Merchant` | `id, tenantId, name, slug, category, phone, email, status, commissionRate, settings` | Tenant-scoped; unique `(tenantId, slug)` |
| `MerchantBranch` | `id, tenantId, merchantId, name, address, latitude, longitude, phone, status` | Multi-branch supported |
| `MerchantUser` | `merchantId, userId, role` (free string, default `owner`) | Join table merchant↔user |
| `Order` | `merchantId?, merchantBranchId?, customerId?, branchId?, driverId?, status, total, paymentMethod, paymentStatus, …` | Orders already carry `merchantId` |
| `PricingRule` | `merchantId?` | Merchant-specific pricing already supported |
| `Payment` | linked via `order.merchantId` (no direct merchantId) | |
| `Commission` | `merchantId?` | |
| `Settlement` | **driver-only** (`driverId`) | No merchant settlement model |

Enums already present: `MerchantStatus`, `BranchStatus`, `PaymentMethod` (incl. `cod`),
`PaymentStatus`, `SettlementStatus`, `OrderStatus`, `DeliveryType`.

## 2. Merchant / branch relationships
`Tenant 1─* Merchant 1─* MerchantBranch 1─* Order` and `Merchant 1─* MerchantUser *─1 User`.
An order belongs to a merchant through `Order.merchantId` and optionally a branch
through `Order.merchantBranchId`.

## 3. Merchant users
`MerchantUser` links a `User` to a `Merchant` with a free-text `role`. Authorization
itself is driven by `UserRole → Role → RolePermission → Permission` (the real RBAC),
not by `MerchantUser.role`.

## 4. Current permissions (packages/db/src/permissions.ts)
Catalog is tenant-agnostic. Relevant codes:
`orders.view/create/update/cancel/assign/force_status`, `customers.view/create/update/block`,
`merchants.view/manage`, `pricing.view/manage`, `payments.view/manage/refund`,
`wallets.view/manage`, `reports.view/export`, `support.view/manage`,
`notifications.view/manage`, `settings.view/manage`, `users.view/create/update/delete/manage_roles`,
`audit.view`, `tracking.view`, `dispatch.*`, `zones.*`, `drivers.*`, `vehicles.*`.

Roles seeded: `platform_admin`, `tenant_admin`, `operations_manager`, `dispatcher`,
`finance`, `support_agent`, `merchant_admin` (orders/customers/pricing/reports/support view),
`driver`, `customer`.

Gap: no `merchant_owner`, `merchant_manager`, `merchant_operator`, `merchant_finance`,
`merchant_viewer`; no `support.create` code (support create is gated by `support.manage`).

## 5. Existing merchant endpoints
Only tenant-admin CRUD under `/merchants` (`merchants.view` / `merchants.manage`) and
`POST /merchants/:id/branches`. **There are no merchant-self-service endpoints.**

## 6. Order APIs
`GET/POST /orders`, `GET /orders/:id`, `GET /orders/:id/timeline`,
`PATCH /orders/:id`, `POST /orders/:id/transition|assign|cancel`.
All tenant-scoped; filters: `status, paymentStatus, customerId, driverId, merchantId, from, to, search`.
`OrdersService.create` recomputes distance server-side, resolves the zone, calls the
pricing engine, ignores client totals, and starts dispatch. **Reusable as-is** for
merchant order creation, provided `merchantId` is forced server-side.

## 7. Pricing APIs
`POST /pricing/quote` (server-side quote), `GET/POST/PATCH /pricing/rules`.
`PricingEngine` is pure and supports merchant/zone/vehicle-scoped rules,
`cod_fee`, `scheduled_fee`, night/peak surcharges, discounts, tax. **Reusable as-is.**
Gap: quote endpoint is tenant-scoped and accepts a client `merchantId`; a merchant-scoped
quote wrapper must force the caller's merchant.

## 8. Customer / address APIs
`GET/POST/PATCH /customers`, `GET /customers/:id`, `GET/POST /customers/:id/addresses`.
Tenant-scoped only. Gap: no merchant ownership on `Customer`; merchant customer
directory must be scoped through the orders a customer has with that merchant.

## 9. Payment APIs
`GET /payments` (filters status/method/merchantId/from/to), `POST /payments`,
`POST /payments/:id/mark-paid`, `POST /payments/:id/refund`. Tenant-scoped.
Gap: merchant view must scope through `order.merchantId`.

## 10. Reporting APIs
`GET /reports/dashboard|orders-by-status|timeseries|operations` — tenant-wide.
Gap: no merchant-scoped aggregations; must add merchant-scoped variants.

## 11. Support APIs
`GET /support/tickets`, `GET /support/tickets/:id`, `POST /support/tickets`,
`POST /support/tickets/:id/messages`, `PATCH /support/tickets/:id/status`.
Tenant-scoped, no merchant ownership field.

## 12. Notifications
`GET /notifications`, `POST /notifications/:id/read` — tenant-scoped list (leaks across
merchant users). `NotificationsService.emit` supports `userId` targeting, and order
events already target `order.createdByUserId`.

## 13. Tracking
`GET /tracking/live`, `GET /tracking/orders/:id` — tenant-scoped. Reusable with a
merchant-scoped wrapper for a single order.

## 14. Auth / RBAC
JWT carries `sub, tenantId, sid, roles, permissions, isPlatformAdmin`; tenant comes
from the signed token only. Refresh-token rotation, lockout, suspended handling,
password change — all reusable. Permissions resolved from DB at login/refresh.

---

## 15. Gaps required by the Merchant Portal

1. **Merchant self-service API surface** — none exists.
2. **Merchant context** — resolve the caller's merchant membership from the token
   (never a client-supplied `merchantId`).
3. **Merchant roles** — add owner/manager/operator/finance/viewer.
4. **Boundary enforcement** — a pure merchant user must not reach tenant-wide
   endpoints (which would leak other merchants' data within the tenant).
5. **COD model** — `Order` cannot distinguish the COD merchandise collection from the
   delivery fee. Need `codAmount` + collection/settlement state.
6. **Merchant settlements** — none; the existing `Settlement` is driver-only.
7. **Support ownership** — `SupportTicket` has no merchant owner.
8. **Merchant-scoped reports/aggregations** — none.
9. **CSV bulk import** — none.
10. **Exports** — none.
11. **Team management** — no merchant-scoped user management; privilege-escalation
    prevention required.
12. **Notifications scoping** — tenant-wide list must be narrowed for merchant users.
13. **Demo data** — no merchant/branches/customers/orders/COD rows exist.

## 16. APIs reusable unchanged
`PricingEngine` + `PricingService.quote`, `OrdersService.create/transition/cancel`
(with forced merchant), `OrderStateMachine`, dispatch engine, `PaymentsService`,
`NotificationsService.emit`, `AuditService`, `AuthService`, RBAC guards, tracking
snapshot, support ticket CRUD (with an ownership column added).

## 17. Minimal backend extensions
- **Schema/migration**: `Order.codAmount`, `codStatus`, `codCollectedAt`, `codSettledAt`;
  `MerchantSettlement`; `SupportTicket.merchantId`; `MerchantUser.branchId`; indexes
  `Order(tenantId, merchantId, status)`, `SupportTicket(tenantId, merchantId)`.
- **Permissions**: add 5 merchant roles (reusing existing codes).
- **Auth**: include resolved `merchantIds` in the JWT payload.
- **Guard**: `MerchantBoundaryGuard` — merchant-only principals may reach only
  `/api/v1/merchant/*`, `/auth/*`, `/health`.
- **Module** `merchant-portal`: context, dashboard, orders (+quote, +import, +export),
  customers, branches, team, payments, COD, settlements, reports, support,
  notifications, profile, business settings — every query filtered by
  `{ tenantId, merchantId }`.
- **Seed**: deterministic demo merchant (branches, users, customers, addresses,
  orders across statuses incl. COD, payments, settlements, tickets).

---

## 18. Verification & post-implementation fixes

End-to-end verification of the merchant portal surfaced and fixed three defects:

1. **`PricingService.loadApplicableRules` scope filter (silent empty result).**
   The scope clauses used `{ OR: [{ field: null }, { field: ctx.field ?? undefined }] }`.
   Prisma treats `{ field: undefined }` inside an `OR` as *match nothing*, so when the
   request had no zone/merchant/vehicle scope **every** rule was filtered out and the
   quote returned `total: 0, ruleName: null`. The clauses are now explicit:
   `ctx.zoneId ? { OR: [null, ctx.zoneId] } : { zoneId: null }` (same for merchant and
   vehicle), preserving the original intent — a scoped rule applies only when the
   request carries that scope, otherwise only unscoped rules apply.

2. **Merchant quote DTO/contract mismatch.** `POST /merchant/orders/quote` rejected the
   payload the merchant order form sent (`pickupAddress`, `dropoffAddress`,
   `deliveryType`, `codAmount` → 400 `BAD_REQUEST`), and `distanceKm` was mandatory so
   the form never supplied it. `MerchantQuoteDto` now accepts optional
   `pickupLat/Lng` + `dropoffLat/Lng` (and optional `distanceKm`); the service computes
   distance via `haversineKm` and resolves the pickup service zone via `ZonesService`,
   mirroring `OrdersService.create`. The form now sends branch coordinates instead of
   address strings.

3. **Riyadh demo zone had no polygon.** `ServiceZone.polygon` was unset, so
   `ZonesService.resolveZone` could never match and the zone-scoped default pricing rule
   was unreachable. The seed now writes a Riyadh bounding polygon (applied to the
   existing demo row as well).

Verified after the fixes: in-zone quote resolves `Default Riyadh Pricing`; out-of-zone
quote returns `total: 0` with no rule; `POST /merchant/orders` creates an order with
server-computed distance/pricing; 18/18 merchant endpoints return HTTP 200; API tests
15/15, merchant typecheck and lint clean.
