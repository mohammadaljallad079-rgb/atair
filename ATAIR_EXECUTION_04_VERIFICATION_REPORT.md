# ATAIR — EXECUTION 04 FINAL VERIFICATION REPORT

**Scope:** Customer-facing portal for عَ الطاير (Logistics / Last-Mile Delivery & Internal Transportation Platform)
**Deliverables:** (1) backend `customer-portal` module in `apps/api`; (2) new Next.js `apps/customer` mobile web app (`:3003`).
**Branch:** `feat/customer-portal`  **HEAD:** `c5588988500c4d60d2da22870944f45ff2da173e`
**Verification date:** 2026-10-06/07  **Verifier:** OpenHands agent (evidence-based, live runtime)

> **Version-control status (per user constraints):** No PR opened. Nothing merged into `main`. No further
> commits pushed. Remote `origin/feat/customer-portal` left exactly as-is (not deleted, history not rewritten).
> `main` remains `c39cb01`. One **uncommitted** fix was produced during verification (see §11).

---

## 0. Verdict

| Area | Result |
|---|---|
| Customer ownership / IDOR isolation | **PASS** |
| Real pricing (quote == create, server-side) | **PASS** |
| Order lifecycle (create → list → track → cancel) | **PASS** |
| Payment truth (no fake gateway) | **PASS** (cash/COD only; card/wallet/online not offered) |
| Tracking truth (no simulated movement) | **PASS** (real `driver_locations` only) |
| Runtime mock audit | **PASS** (no mock/fake/demo data in runtime paths) |
| Responsive 360→1440 | **PASS** (0 px horizontal overflow on 9 routes × 6 viewports) |
| RTL Arabic / LTR English | **PASS** |
| Brand assets / no mirrored artwork | **PASS** |
| Auth lifecycle (login/refresh/rotate/logout) | **PASS** |
| Boundary guard (customer confined to `/customer/*`) | **PASS** (403 on all tenant-wide routes) |
| Build / typecheck / lint / tests | **PASS** (all workspaces) |
| **Malformed path param handling** | **FAIL → FIXED** (§11) |

Overall: implementation is **functionally correct and evidence-backed**; one robustness defect was found by
adversarial verification and fixed (uncommitted, awaiting your decision).

---

## 1. Customer Ownership / IDOR

Two real customers were registered against tenant `atair-demo`; each got its own JWT-resolved context.

| Check | Result |
|---|---|
| Customer A register | `201` — user `e08c82a1…`, roles `['customer']`, perms `['orders.view','tracking.view']` |
| Customer B register | `201` — user `a4b4d556…`, roles `['customer']`, perms `['orders.view','tracking.view']` |
| A own profile (`/customer/me`) | `200` |
| A own order detail / timeline / tracking | `200 / 200 / 200` |
| A own ticket get / message | `200 / 201` |
| **A → B order detail** | **`404 ORDER_NOT_FOUND`** |
| **A → B order tracking** | **`404`** |
| **A → B order timeline** | **`404`** |
| **A → B order cancel** | **`404`** |
| **A PATCH B address** | **`404 ADDRESS_NOT_FOUND`** |
| A list addresses | `200` — only A's own address returned |
| A list tickets / B list tickets | `200` — disjoint sets (1 each) |
| **A → B ticket get** | **`404 TICKET_NOT_FOUND`** |
| **A → B ticket message** | **`404 TICKET_NOT_FOUND`** |

No endpoint accepts a client-supplied customer id; the acting customer is always resolved from the token
(`CustomerContextService`). Ownership failures return `404` (not `403`) to avoid resource enumeration.

---

## 2. Real Pricing (server-side, quote == create)

Quote input carries **no** price/customerId/tenantId (`CustomerQuoteDto`). Money is computed by the real
`PricingService`/`PricingEngine`.

| Check | Result |
|---|---|
| Quote (Riyadh zone, 2 kg, COD) | `201` — total **17.17 SAR**, rule `Default Riyadh Pricing` (`feb7a2eb…`) |
| Create order, same delivery params | `201` — total **17.17 SAR**, same `ruleId` |
| Quote vs create parity | **TRUE** (`17.17 == 17.17`; breakdown identical: base 8.00 + distance 4.05 + time 2.10 + night 0.03 + cod 3.00) |
| Nonexistent service area | `404 SERVICE_AREA_NOT_FOUND` |
| No pricing rule applies (rules temporarily deactivated, then restored) | `409 PRICING_UNAVAILABLE` on **both** quote and create — never a silent zero fare |

---

## 3. Order Lifecycle (live, DB-backed)

| Step | Result |
|---|---|
| Create order | `201` `ATA-20261006-00013`, status `searching_driver` |
| `GET /customer/orders?bucket=active` | `200` — real rows returned |
| `GET /customer/orders/:id` | `200` — full record + statusHistory + deliveryAddress |
| `GET /customer/orders/:id/timeline` | `200` — 3 entries |
| `GET /customer/orders/:id/tracking` | `200` — real snapshot (`driverLocation: null`, no driver assigned) |
| `POST /customer/orders/:id/cancel` | `201` → status `cancelled`, `cancelledAt` set, reason persisted |
| Detail after cancel | `200` — status `cancelled` |
| Cancel again (terminal state) | `409 ORDER_NOT_CANCELLABLE` |

---

## 4. Payment Truth

- Only **cash** and **cod** are offered by the customer order form and accepted by the DTO (`IsIn(['cash','cod'])`).
- The only registered provider is `CashPaymentProvider` (`payments.service.ts`), which makes **no external call**.
- Card / wallet / online / bank_transfer exist in the schema enum but have **no provider** — they are not exposed
  in the customer UI, so there is no fake "paid" state.
- COD is tracked as a distinct domain field (`codAmount`, `codStatus`, `codCollectedAt`, `codSettledAt`) separate
  from the delivery fee (`total`).
- **No payment gateway is claimed to be integrated.** Provider interface is a clean extension point (Moyasar/Tap/
  Stripe/HyperPay named only as future adapters).

---

## 5. Tracking Truth

- `customer-orders.service.ts` → `tracking()`: *"Only expose a real recorded driver location; never simulate movement."*
- Reads the latest real row from `driver_locations` for the assigned driver; returns `null` when none exists.
- **No** GPS simulation, no mock coordinates, no fake ETA interpolation, no seed rows for locations.
- Frontend (`/tracking/[id]`) polls every 15 s **only while the tab is visible**, and explicitly notes
  *"there is no push channel in this app."* No WebSocket/SSE is claimed.

---

## 6. Runtime Mock Audit

- Customer runtime (`apps/customer/src`) contains **no** mock/fake/demo/sample/placeholder data records.
  The only literal array (`QUICK` on `/home`) is navigation config; `nav.ts` is static nav config.
- Customer-portal, tracking, and payments API modules contain **no** mock/fake/simulate/random runtime logic.
- `Math.random()` appears only in `seed.ts` (synthetic national IDs) and a toast-id generator — neither surfaces
  as business data.

---

## 7. Responsive Layout (360 → 1440)

Horizontal overflow = `scrollWidth − clientWidth`, measured per route per viewport. **All zero.**

| route | 360 | 390 | 430 | 768 | 1024 | 1440 |
|---|---|---|---|---|---|---|
| /home | 0 | 0 | 0 | 0 | 0 | 0 |
| /orders | 0 | 0 | 0 | 0 | 0 | 0 |
| /orders/new | 0 | 0 | 0 | 0 | 0 | 0 |
| /addresses | 0 | 0 | 0 | 0 | 0 | 0 |
| /notifications | 0 | 0 | 0 | 0 | 0 | 0 |
| /profile | 0 | 0 | 0 | 0 | 0 | 0 |
| /support | 0 | 0 | 0 | 0 | 0 | 0 |
| /orders/:id | 0 | 0 | 0 | 0 | 0 | 0 |
| /tracking/:id | 0 | 0 | 0 | 0 | 0 | 0 |

**Worst overflow: 0 px.** (Rendered with system Chromium via Playwright at each width.)

---

## 8. RTL / LTR

- Default: `dir="rtl" lang="ar"` on every route.
- After switching to English: `dir="ltr" lang="en"` on every route.
- Layout flips; **artwork does not** (see §9).

---

## 9. Brand Assets / No Mirrored Artwork

- Official source preserved untouched: `public/assets/brand/logo-original.jpeg` (git-tracked).
- Derived web assets (`logo-mark.png/.webp`, `logo-full.png/.webp`) are **byte-identical** across
  `public/`, `apps/admin`, `apps/merchant`, `apps/customer` (md5 verified for all four files).
- `BrandLogo` renders via `<picture>` (webp + png fallback); computed `transform: none`, `filter: none`
  on login and navigation variants — **no `scaleX(-1)` mirror**.
- Live check at 390 px: logo loaded (`naturalWidth 420 × naturalHeight 260`), alt `عَ الطاير`.
- Unit test `brand-logo.test.tsx` asserts the assets, Arabic alt, and absence of a mirror transform.

---

## 10. Auth Lifecycle

| Check | Result |
|---|---|
| Login (`identifier`+`password`+`tenantSlug`) | `200` — roles `['customer']`, perms `['orders.view','tracking.view']` |
| `GET /customer/me` with access token | `200` — profile returned |
| Refresh (rotation) | `200` — new access **and** new refresh token |
| Reuse **old** refresh token | `401 Invalid or expired refresh token` (rotation enforced) |
| Garbage bearer token | `401 UNAUTHORIZED` |
| No token | `401 UNAUTHORIZED` |
| Logout | `200` |
| Wrong password | `401 INVALID_CREDENTIALS` |
| Hard reload (session restore) | `401 /customer/me` → `200 /auth/refresh` → `200 /customer/me` → stays on `/home` (RTL). This 401 is the expected memory-token bootstrap, not a leak. |

Token storage: access token **in memory only** (XSS surface reduced); refresh token in `localStorage` with a
non-authoritative `atair.customer.session` cookie flag used solely for a coarse middleware redirect.

---

## 11. Defect Found & Fixed (adversarial verification)

**Finding:** Requests with a **non-UUID `:id`** (e.g. `/api/v1/customer/orders/new/tracking`, reachable from
the customer nav) returned **HTTP 500 INTERNAL_ERROR** — a Prisma UUID-cast error surfaced as a 500.

**Reproduction (before):**
```
GET /api/v1/customer/orders/new            -> 500 INTERNAL_ERROR
GET /api/v1/customer/orders/new/tracking   -> 500 INTERNAL_ERROR
GET /api/v1/customer/orders/new/timeline   -> 500 INTERNAL_ERROR
GET /api/v1/customer/support/tickets/new   -> 500 INTERNAL_ERROR
```

**Fix:** applied `ParseUUIDPipe` to all 9 `@Param('id')` params in
`apps/api/src/modules/customer-portal/customer-portal.controller.ts` (minimal, idiomatic NestJS).

**Reproduction (after):**
```
GET /api/v1/customer/orders/new            -> 400 BAD_REQUEST
GET /api/v1/customer/orders/new/tracking   -> 400 BAD_REQUEST
GET /api/v1/customer/orders/new/timeline   -> 400 BAD_REQUEST
GET /api/v1/customer/support/tickets/new   -> 400 BAD_REQUEST
valid UUID detail/tracking                 -> 200 (unchanged)
IDOR to another customer's order           -> 404 ORDER_NOT_FOUND (unchanged)
```

Gates after fix: API typecheck **clean**, API lint **clean**, API tests **7 suites / 33 tests pass**.
**This change is uncommitted** (`git status`: 1 modified file) and no commit/push was made.

---

## 12. Regression Gates (all workspaces)

| Gate | Result |
|---|---|
| `npm run typecheck` (api, admin, merchant, customer) | **PASS** |
| `npm run lint` (api eslint --max-warnings=0; 3× next lint) | **PASS** — 0 warnings/errors |
| API tests (`api:test`) | **7 suites / 33 tests PASS** |
| Admin tests | **6 suites / 24 tests PASS** |
| Merchant tests | **5 suites / 23 tests PASS** |
| Customer tests | **2 suites / 7 tests PASS** |
| `api:build` (nest) | **PASS** |
| `admin:build` | **PASS** |
| `merchant:build` | **PASS** |
| `customer:build` | **PASS** |

---

## 13. Boundary Guard (least privilege)

Customer token against tenant-wide routes → **403 `FORBIDDEN` "Customer accounts may only access the customer app endpoints"**:
`orders, customers, drivers, merchants, payments, settings, users, vehicles, wallets, zones, notifications`.
(`dispatch/pricing/reports/support/tracking/audit` have no GET collection route → `404`; no data returned either way.)
Admin (`tenant_admin`) token → `200` on `orders, customers, drivers, merchants, zones, users` — no regression.
`customer` role carries only `orders.view` + `tracking.view` (`packages/db/src/permissions.ts`).

---

## 14. Environment / Runtime

- Docker daemon running; Postgres container `atair-postgres` (postgres:16-alpine, db `atair`), migrations applied, seed complete.
- API `:3000` (health `200`), customer app `:3003` (login `200`), Postgres `:5432`.
- Node v24.21.0, npm 11.19.1, Chromium 153 (headless verification).

---

## 15. Version Control (unchanged, per constraints)

```
feat/customer-portal  HEAD c5588988500c4d60d2da22870944f45ff2da173e
origin/feat/customer-portal  (left as-is — not deleted, history not rewritten)
main / origin/main            c39cb01
committed diff main...HEAD:   80 files changed, 6723 insertions(+), 9 deletions(-)
uncommitted:                  1 file (the ParseUUIDPipe fix, §11)
```
No PR. No merge. No push.

---

## 16. Open items / decisions for you

1. **Commit the §11 fix?** It is currently uncommitted. Say the word and I will commit it on `feat/customer-portal`
   (no push).
2. **PR / merge / push** remain on hold pending your explicit go-ahead.
3. Optional hardening (out of scope unless requested): add `ParseUUIDPipe` to `merchant-portal` controllers for
   the same 500-on-malformed-id behavior; wire a real map provider for `/tracking/[id]` (currently a coordinate
   placeholder by design, since no map provider is configured).
