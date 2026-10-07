# ATAIR — Final Production Readiness Audit

Audit of the merged `main` branch (PR #3), performed on the local clone only.
**No production deployment, migration, SSH, Nginx, PM2, or production env change was performed.**

- Date: 2026-10-07
- Auditor: OpenHands (automated technical audit)
- Scope: merged `main` at merge commit `95fb80c`

---

## 1. Git state

| Item | Value |
| --- | --- |
| Repository | `https://github.com/mohammadaljallad079-rgb/atair` |
| Audited branch | `main` |
| `main` HEAD | `95fb80c81eaeed7bb350772d512555170daee996` |
| `origin/main` | `95fb80c81eaeed7bb350772d512555170daee996` |
| Local `main` == `origin/main` | **YES** (identical SHA) |
| Working tree | clean |
| Merge commit | `95fb80c` — `feat(admin): Operational Control Center — fleet, dispatch, reports & RBAC (#3)` |
| Merge parents | `f058f7f` (single parent — PR #3 was squash-merged) |
| `95fb80c` ancestor of `origin/main` | YES |

### 2. Merge commit / PR #3 diff
- 65 files changed, +4418 / −317 (44 API files, 21 admin files).
- Touched: audit, customers, dispatch, drivers, merchants, notifications, orders, payments, pricing, reports, settings, support, users, vehicles, wallets, zones (API); admin pages for audit/customers/dispatch/drivers/merchants/notifications/operations/orders/payments/pricing/reports/roles/settings/support/users/vehicles/wallets/zones + i18n dictionary.
- **No Prisma schema or migration changes** in PR #3 (see §7).

### 3. Corrective branch created during this audit
Because a critical defect was found (§12), a fix was committed to a clearly named branch (audit rule §23):

| Item | Value |
| --- | --- |
| Branch | `fix/audit-update-body-validation` |
| HEAD | `c627b5239802d8238521983e1c9919d29a5b62e5` |
| Base | `95fb80c` (`main`) |
| Pushed / PR / deployed | **NO** |
| `main` untouched | YES |

---

## 4. Module-by-module status

Legend: **FULLY FUNCTIONAL** · **PARTIALLY FUNCTIONAL** · **READ ONLY BY DESIGN** · **BLOCKED**

| Module | Status | Evidence / notes |
| --- | --- | --- |
| Auth (login/refresh/logout) | FULLY FUNCTIONAL | `auth.service.ts`; hashed refresh tokens, rotation, reuse detection, lockout, audit. Tests cover. |
| Dashboard / Reports | FULLY FUNCTIONAL | `reports.controller.ts`; tenant-scoped; raw SQL for timeseries uses parameterised `${tenantId}::uuid`. |
| Live Operations | PARTIALLY FUNCTIONAL | Backend `reports.liveOverview` + `dispatch.board` are real. **No WebSocket/SSE**: UI is polling/refetch (see §Known limitations). |
| Orders | FULLY FUNCTIONAL | Server-side state machine (`order-state.machine.ts`); forced override requires reason; no hard delete route. |
| Dispatch | FULLY FUNCTIONAL | `dispatch.service.ts` board + offers + redispatch, tenant-scoped. |
| Drivers | FULLY FUNCTIONAL | create/update/suspend/unsuspend/availability/vehicle assignment; audited. |
| Vehicles | FULLY FUNCTIONAL (after fix) | `update` used `Partial<>` → unvalidated body; fixed in `c627b52`. |
| Merchants | FULLY FUNCTIONAL (after fix) | `update` mass-assignable via `Partial<>`; fixed. |
| Customers | FULLY FUNCTIONAL | typed `UpdateCustomerDto`; explicit field spread of a validated DTO only. |
| Zones | FULLY FUNCTIONAL (after fix) | `update` mass-assignable; fixed. |
| Pricing | FULLY FUNCTIONAL | Historical integrity verified (§6); zero-fare hole closed; audited. |
| Payments | FULLY FUNCTIONAL | Cash/COD provider only; refunds validated, audited. **No external PSP.** |
| Wallets | FULLY FUNCTIONAL | All movements through ledger + `$transaction`; negative balance blocked; adjustment reason mandatory. |
| Notifications | PARTIALLY FUNCTIONAL | Record + attempt persisted; **no outbound provider wired** — never claims external delivery. |
| Support | FULLY FUNCTIONAL | tickets/messages/status/priority/assign; tenant-scoped; audited. |
| Users / Roles | FULLY FUNCTIONAL (after fix) | Privilege-escalation guard present; `updateRole` body was `Partial<>`; fixed. |
| Settings | FULLY FUNCTIONAL | persisted; audited; value not secret-filtered (see limitations). |
| Audit Log | READ ONLY BY DESIGN | Only `GET` handlers; no write route. |
| Merchant Portal | FULLY FUNCTIONAL (after fix) | `updateBranch` body was `Partial<>`; fixed. |
| Customer Portal | FULLY FUNCTIONAL | `@Public` register/config; auth-guarded self-scoped routes. |
| Public Site | READ ONLY BY DESIGN | `@Public` branding/areas/tracking/contact. |

---

## 5. Orders — verified workflow

- **List/search/pagination/filters**: `OrderQueryDto` supports `status` (`active` = `ACTIVE_STATUSES`), `paymentStatus`, `customerId`, `driverId`, `merchantId`, `from`, `to`, `search` (orderNumber/pickup/dropoff). Pagination via `PaginationQueryDto`; response `paginated()`.
- **Details/timeline**: `get()` includes items, statusHistory, assignments, addresses, attempts, proofs, payments, customer, driver, merchant; `GET /orders/:id/timeline`.
- **Assign / reassign**: `assignDriver` creates an assignment, sets driver busy/unavailable, updates order to `assigned`, writes history — one `$transaction`. Reassign = calling assign again; prior offers are closed via `dispatch.closeForOrder`.
- **Cancel + reason**: `POST /orders/:id/cancel` → `transition(status:'cancelled', reason)`; reason persisted to `cancellationReason`.
- **Valid/invalid transitions**: enforced by `OrderStateMachine.assertTransition`; invalid transitions throw `Errors.invalidTransition` (server-side).
- **Force override**: `POST /orders/:id/transition` with `orders.force_status` permission; **mandatory reason** enforced (`throw Errors.validation('A reason is required for a forced status override')`).
- **Redispatch**: `POST /dispatch/orders/:orderId/redispatch`.
- **Hard delete**: **not exposed** — no `DELETE` route on orders; terminal orders cannot be modified (`ORDER_TERMINAL`).
- **Manual create**: `CreateOrderDto` validates customer/merchant/vehicleType belong to tenant; distance recomputed via haversine; discount resolved server-side; zone resolved server-side; **pricing from `PricingService.quote`**; rejects unpriced orders (`PRICING_UNAVAILABLE`). No frontend pricing duplication (admin create posts to `/orders`; preview posts to `/pricing/quote`).

## 6. Pricing — historical integrity

- Order create persists `priceBreakdown` (the quote snapshot), `subtotal`, `discountAmount`, `taxAmount`, `surchargeAmount`, `total` on the `Order` row.
- A repo-wide search found **no** path that recomputes an existing order's totals from live pricing rules. Editing/activating/deactivating a rule does not touch historical orders. **Historical integrity: intact.**
- Sensitive changes (`pricing_rule.create` / `pricing_rule.update`) are audited; RBAC `pricing_manage` required. Zero-fare hole closed (`PRICING_UNAVAILABLE`).

## 7. Payments & Wallets

- **Payments**: list/filters/details/related order/customer/refunds. Amount always taken from the stored order total, never the client. Idempotent create (`PAYMENT_EXISTS`). Refund: requires `paid`/`partially_refunded`, positive amount, blocks over-refund, mandatory reason, records `refund` + `transaction`, audited. Provider abstraction exists; **only `CashPaymentProvider` is wired** — no external PSP. The UI/service never claims an external charge was processed.
- **Wallets**: balance only ever moves through `walletTransaction` inside a `$transaction`; `adjust` requires a reason, blocks negative balance, audited. `creditForOrder` is idempotent per order reference. No direct balance write bypassing the ledger.

## 8. Notifications
- Persists a `Notification` record + `NotificationLog` attempt with `status: queued`. `retry` re-queues; terminal (`sent`/`read`) cannot retry. **No push/SMS/email provider is integrated**, so the code deliberately stops at "queued" and does not claim external delivery.

## 9. RBAC / Tenant isolation

- Global guard chain: `ThrottlerGuard → JwtAuthGuard → MerchantBoundaryGuard → CustomerBoundaryGuard → PermissionsGuard`.
- Tenant comes from the signed JWT (`AuthUser.tenantId`), never client input.
- Every service `findFirst`/`update` is scoped by `tenantId` (spot-checked across orders, payments, wallets, pricing, users, roles, settings, audit, reports, support, customers, drivers, vehicles, merchants, zones, notifications, dispatch).
- Cross-tenant reference guards: orders `assertBelongs`, payments/wallets `findFirst({tenantId})`, support `customerId` check, users/roles tenant-scoped.
- **Privilege escalation**: `UsersService.assertCanGrant` (roles) and `assertCanGrantPermissions` (role permissions) reject grants exceeding the actor's own permission set; platform admins bypass. System roles non-editable/non-deletable; roles in use cannot be deleted.
- Audit reads are tenant-scoped (platform admin sees all).

## 10. Security

- No tracked `.env`/keys/certs (only `.env.example`); `.gitignore` excludes `.env*`.
- No hardcoded credentials found; JWT secrets have dev fallbacks (see limitations).
- Error filter never returns stack traces; `AuditInterceptor`/`stripSensitive` redact password/token fields.
- Public tracking code is 128-bit opaque (Crockford base32), non-enumerable.
- Helmet + CORS allow-list + global rate limiting configured.
- **Critical finding (fixed)**: see §12.

## 11. Database / Prisma

- PR #3 introduced **no migrations and no schema change**.
- Migrations present: `20261005025416_init_core`, `20261005204345_merchant_portal`, `20261007000000_public_website`.
- **Production migration requirement**: none for this merge (migrations were already introduced by PR #1/#2). If the production DB predates them, `prisma migrate deploy` is required — **to be confirmed by the operator; not run here.**
- Schema uses UUID PKs, `@@unique`/`@@index` per tenant, `onDelete: Cascade` for tenant-owned rows.

## 12. Critical finding & fix (mass-assignment)

**Severity: HIGH. Status: FIXED on `fix/audit-update-body-validation` (`c627b52`), NOT merged.**

- **Problem**: update endpoints declared their body as the built-in `Partial<X>`. `Partial<>` is a type-only alias that erases to `Object` in emitted `design:paramtypes` metadata. NestJS skips `ValidationPipe` for built-in metatypes, so those PATCH bodies were **unvalidated** and services spread the raw body into Prisma (`data: {...dto}`) → **mass assignment**.
- **Affected on `main`**: `vehicles.update`, `merchants.update`, `zones.update`, `users.updateRole`, `merchant-portal.updateBranch`.
- **Evidence (compiled, before)**: `design:paramtypes` = `[Object, String, Object, String]`; (after) = `[Object, String, UpdateVehicleBody, String]`, etc.
- **Impact**: authenticated actor with the module's manage permission could set fields not present in the create DTO (e.g. `status`, `commissionRate`, `isActive`) without validation.
- **Fix**: replace with `PartialType(X)` (real class metatype) and pick fields explicitly in the services. Regression test `apps/api/src/common/dto/body-metatype.spec.ts` (10 tests) asserts metatype + `ValidationPipe` rejection of unknown keys.

## 13. API quality

- DTO validation with `whitelist + forbidNonWhitelisted` (now effective on all update bodies).
- Consistent error envelope (`AllExceptionsFilter`); pagination helper; tenant scoping throughout.
- Noted (not blocking): `OrderQueryDto.status/paymentStatus` are `@IsString()` (arbitrary strings become Prisma filter values); `TransitionOrderDto.status` is `@IsString()` with server-side state-machine enforcement; `DriversService.setStatus` accepts an unbounded status string; `settings.set` accepts an arbitrary key (gated by `settings_manage`); notifications `send` verifies the template but not that a provided recipient belongs to the tenant.

## 14. Admin UX & i18n

- Loading/empty/error/success/validation states present across dashboard pages; **no `window.alert()`** as final UX.
- Arabic RTL (`<html lang="ar" dir="rtl">`) / English LTR; brand bird logo is **not mirrored in RTL** (documented in `brand-logo.tsx`).
- **i18n parity verified programmatically**: `ar` = 561 keys, `en` = 561 keys, **0 duplicates, 0 missing on either side**; `translate()` interpolation `{var}` works; `dictionary.test.ts` passes.

## 15. Tests

Baseline on `main`:

| Suite | Result |
| --- | --- |
| API | 15 suites / 65 tests pass |
| Admin | 6 suites / 24 tests pass |
| Merchant | 5 suites / 23 tests pass |
| Customer | 2 suites / 7 tests pass |
| Web | 1 suite / 3 tests pass |

On `fix/audit-update-body-validation`: **API 16 suites / 75 tests pass** (+1 suite, +10 tests). No existing test was weakened, disabled, or mocked out.

## 16. Build results

All green on `main` and on the fix branch:
`db:generate` OK · `typecheck` OK (all workspaces) · `lint` OK (all workspaces) · full `build` OK (API `dist` + admin/merchant/customer/web `.next`).

## 17. Known limitations (non-blocking)

1. **No real-time transport** — Live Operations/Dispatch use polling/refetch, not WebSocket/SSE.
2. **No external notification provider** — notifications stop at `queued`.
3. **No external payment provider** — only cash/COD.
4. **JWT dev fallback secrets** — production must set `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`; startup only hard-fails on missing `DATABASE_URL`.
5. **Enum alignment** — dispatch ranks drivers with `verificationStatus: 'verified'`; confirm the production enum uses that value.
6. **Notifications read-state** — `markRead` only sets `status: 'read'`, no separate read flag.
7. **`settings.set`** — no key whitelist or secret-value redaction.
8. **Update-body hardening (defence in depth)** — the fix validates and picks fields; unrelated to tenant isolation (tenant is never client-supplied).

## 18. Deployment prerequisites

1. Merge `fix/audit-update-body-validation` (or re-apply `c627b52`) into `main` — **do not deploy with the mass-assignment defect**.
2. Set `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`, `NODE_ENV=production`.
3. Confirm whether `prisma migrate deploy` is required for the target DB; run it **only** with operator approval.
4. Build artifacts: `npm run db:generate && npm run build`.
5. Seed only if the production DB is empty (`npm run db:seed` creates demo tenants/users — review before running).

## 19. Final decision

### **NOT READY FOR PRODUCTION DEPLOYMENT**

Sole blocker is the HIGH mass-assignment defect on `main`, which is **fixed on `fix/audit-update-body-validation` (`c627b52`) but not yet merged**. All other gates (tests, builds, RBAC, tenant isolation, historical pricing integrity, wallet ledger integrity, i18n parity) pass.

After `c627b52` is merged into `main`, and the §18 prerequisites are met, the audited surface is **READY FOR PRODUCTION DEPLOYMENT** for the cash/COD, non-real-time configuration.

---

## 20. Explicit confirmation

**NO PRODUCTION DEPLOYMENT WAS PERFORMED.**
