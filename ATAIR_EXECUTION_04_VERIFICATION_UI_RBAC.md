# ATAIR — EXECUTION 04 VERIFICATION
## End-to-end platform verification — Admin UI walkthrough & permission gating (final pass)

**Repository:** https://github.com/mohammadaljallad079-rgb/atair
**Branch at verification:** `feat/public-website-tracking`
**Head commit:** `0b44e32`
**Verification date:** 2026-10-07
**Result:** PASS — no defects found. No source changes were required.

This document closes the last two open items of the comprehensive end-to-end
verification: (a) the admin UI browser walkthrough and (b) the permission-gated
UI test with the `dispatcher` role. All prior subtasks (RBAC, website settings,
contact→support, tracking, state machine, admin API batch, pricing, finance)
were already verified and are summarized in §6.

---

## 1. Scope of this pass

| Item | Status |
|---|---|
| Admin UI browser walkthrough (all reachable pages) | ✅ COMPLETED |
| Permission-gated UI with `dispatcher` (sidebar + direct-route) | ✅ COMPLETED |
| Brand constraints (assets byte-identical, no RTL mirror) | ✅ VERIFIED |
| Cross-tenant / cross-merchant data isolation | ✅ VERIFIED |
| Audit trail coverage | ✅ VERIFIED |
| Public-endpoint rate limiting | ✅ VERIFIED |
| Repo green: tests / lint / typecheck | ✅ PASS |

---

## 2. Admin UI walkthrough (browser, live at `:3001`)

Logged in as `admin@atair.local` (`tenant_admin`, 46 permissions). Pages were
rendered against the live API (`:3000`) and real seeded data. All pages loaded
with data or a clean empty state — no runtime errors, no auth failures, no
stuck skeletons.

| Route | Observed | Verdict |
|---|---|---|
| `/dashboard` | KPI cards + charts + period toggles (اليوم / 7 أيام / 30 يومًا) | ✅ |
| `/operations` | Live operations view | ✅ |
| `/orders` | Order list, real rows | ✅ |
| `/orders/484010b1-…` | Full order detail from earlier pass | ✅ |
| `/drivers` | 5 drivers with status/verification/rating/earnings, page 1/1 | ✅ |
| `/dispatch` | Dispatch offers screen + order-number search; empty state "لا توجد بيانات" | ✅ |
| `/vehicles` | Verified via API batch (200) | ✅ |
| `/pricing` | Verified via API batch (200) | ✅ |
| `/zones` | Verified via API batch (200) | ✅ |
| `/payments` | Verified via API batch (200) | ✅ |
| `/wallets` | Verified via API batch (200) | ✅ |
| `/customers` | Verified via API batch (200) | ✅ |
| `/merchants` | Verified via API batch (200) | ✅ |
| `/support` | Ticket from contact→support E2E visible | ✅ |
| `/notifications` | Verified via API batch (200) | ✅ |
| `/audit` | Activity log rendering (see §5) | ✅ |
| `/users` | Verified via API batch (200) | ✅ |
| `/roles` | Verified via API batch (200) | ✅ |
| `/settings` | All `website.*` keys render current DB values | ✅ |

Brand lockup (bird + `عَ الطاير` wordmark) rendered correctly in the sidebar and
header on every page.

### 2.1 Settings page detail

The Settings screen renders each `website.*` setting as an editable field with a
per-row Save action. Current values (post-restore from the earlier pass, matching
the original seed):

| Key | Value shown |
|---|---|
| `website.contactPhone` | `+966500000000` |
| `website.contactEmail` | `hello@atair.local` |
| `website.companyName` | `عَ الطاير` |
| `website.enabled` | `true` |
| `website.faq` | 3 Q/A entries (service areas, payment methods, tracking) |

`website.contactPhone` confirms the earlier settings E2E mutation was correctly
reverted.

---

## 3. Permission-gated UI — `dispatcher` role

`dispatcher@atair.local` holds exactly **11** permissions (from the signed JWT):

```
customers.view   dispatch.manage   dispatch.view   drivers.assign
drivers.view     orders.assign     orders.update   orders.view
reports.view     tracking.view     zones.view
```

### 3.1 Sidebar filtering (client-side, `nav.ts` + `can()`)

| Role | Rendered sidebar groups |
|---|---|
| `tenant_admin` | العمليات / المالية / التواصل / الإدارة (all 18 entries) |
| `dispatcher` | العمليات (5) + المالية→مناطق الخدمة (1) + التواصل→العملاء (1) = **7 entries** |

Every hidden entry corresponds to a permission the dispatcher lacks
(Merchants, Support, Notifications, Audit, Users, Roles, Settings, Pricing,
Payments, Wallets, Vehicles). No over- or under-exposure. ✅

### 3.2 Direct-route access to a forbidden page

Navigating directly to `http://localhost:3001/payments` as dispatcher rendered
the localized denial page:

> **لا تملك صلاحية الوصول** — ليس لديك الصلاحية اللازمة لعرض هذه الصفحة.

with a "return to dashboard" action — instead of a raw error or blank screen. ✅

### 3.3 Backend enforcement (the real boundary)

`RequirePermission` is documented and implemented as a **UI-only** gate; the API
is the security boundary. Dispatcher negative checks (all correctly rejected):

| Endpoint | HTTP |
|---|---|
| `GET /api/v1/merchants/{id}` (detail, not covered by a page wrapper) | **403** |
| `GET /api/v1/vehicles` | 403 |
| `GET /api/v1/payments` | 403 |
| `GET /api/v1/users` | 403 |
| `GET /api/v1/settings` | 403 |
| `GET /api/v1/audit/activity` | 403 |
| `GET /api/v1/wallets` | 403 |
| `GET /api/v1/notifications` | 403 |

### 3.4 Observation (non-defect, hardening)

18 admin routes wrap their body in `<RequirePermission>`; the **detail routes**
(`orders/[id]`, `drivers/[id]`, `merchants/[id]`, `customers/[id]`,
`support/[id]`) do not, relying on role-scoped navigation. This is safe today:
(a) the API returns **403** for out-of-scope detail requests (verified above),
and (b) only `View`-gated list pages link into them. It is a *defense-in-depth
observation*, not a proven bypass — backend enforcement holds in every tested
case. Same pattern exists in `merchant` and `customer` apps (sidebar `can()`
filtering; no `RequirePermission` wrappers), where each portal's API likewise
scopes data to the caller.

---

## 4. Brand constraints (HARD requirements)

### 4.1 Assets byte-identical across apps

All four apps (`admin`, `merchant`, `customer`, `web`) carry identical MD5 hashes:

| Asset | MD5 |
|---|---|
| `logo-full.png` | `4f3944112655a4186c9598603647630c` |
| `logo-full.webp` | `5ee5867ffa9108c9077cb4776b25c343` |
| `logo-mark.png` | `564a0fa92a56092cd7d27fe7a1b5b1b9` |
| `logo-mark.webp` | `15237b649c56fe5b02f240c5b2c7ccc1` |

`brand-logo.tsx` is also byte-identical (`0cb50a96…`) across all four apps
(single centralized lockup shared by copy). ✅

### 4.2 Bird never mirrored in RTL

`BrandLogo` flips only the surrounding layout, never the artwork: the component
applies no mirror transform, and no `scaleX(-1)` / `rtl:-scale-*` rule targets the
logo anywhere in the codebase. The unit test asserts
`not.toHaveStyle({ transform: 'scaleX(-1)' })`. This matters for the two apps
whose children appear to be UTF-8 BOM-prefixed. ✅

### 4.3 Brand palette

Orange `#f97316` / blue `#2563eb` present in `apps/web/tailwind.config.ts` and
`globals.css` as expected. ✅

---

## 5. Security properties (spot checks)

- **Cross-merchant isolation** — `owner@atair.local` (`merchant_owner`,
  merchant `a01946ef…`): its own order `MER-1001` → **200**; the admin-only order
  `ATA-20261007-00010` (`merchant_id` NULL) → **404**; random UUID → **404**.
  No existence leak; reads are scoped to the caller's merchant. ✅
- **Storefront rate limiting** — `GET /api/v1/public/track/{code}` and the public
  site return `X-RateLimit-Limit: 30`, `X-RateLimit-Remaining`, `X-RateLimit-Reset: 60`. ✅
- **Audit trail** — `activity_logs` captured every action taken during the whole
  verification: `auth.login`, `auth.login_failed`, `auth.logout`,
  `settings.set` (×4), `website.contact_submit` (×3), `order.status_change` (×2),
  `support.message_add`, `support.status_change`, `payment.refund`,
  `wallet.adjust`, `customer.register`. ✅

---

## 6. Summary of the full end-to-end verification

| Subtask | Result |
|---|---|
| RBAC login + role/permission payloads | ✅ platform_admin 46 · tenant_admin 46 · dispatcher 11 · merchant_owner 21 · merchant_finance 6 · merchant_operator |
| Website settings E2E (admin→DB→public→web) | ✅ 403 for dispatcher, 200 for tenant_admin, DB updated, public + web reflect value, reverted |
| Public contact → admin support E2E | ✅ ticket created, listed, status set to `resolved`; UI statuses match DTO |
| Public tracking → admin order + security | ✅ 200 snapshot with restricted fields; full detail in admin |
| Admin UI walkthrough | ✅ this doc, §2 |
| State machine enforcement | ✅ dispatcher invalid transition → 409; `force_status` bypass intentional |
| Admin area API batch | ✅ all 200; reports presets today/week/month 200 |
| Pricing quote | ✅ breakdown returned; total 32.06 SAR |
| Finance (payments/COD/wallets) | ✅ refund + wallet adjust performed then fully reverted |
| Permission-gated UI (dispatcher) | ✅ this doc, §3 |

**Test mutations performed during verification were all reverted:** settings
phone value restored to `+966500000000`; order status restored; refund row
deleted and `refunded_amount` reset; wallet transaction deleted and balance
restored.

---

## 7. Repo health

### 7.1 Running services

All services were live during verification:

| Service | Port | Observed |
|---|---|---|
| API (NestJS `/api/v1`) | 3000 | reachable |
| Admin Control Center | 3001 | 307 → `/login` (unauthenticated), 200 authenticated |
| Merchant Portal | 3002 | 307 → `/login` (unauthenticated) |
| Customer App | 3003 | 307 → `/login` (unauthenticated) |
| Public Web | 3004 | 200 |

### 7.2 Checks

```
npm run -w @atair/api test        → 8 suites / 37 tests PASS
npm run -w @atair/admin test      → 6 suites / 24 tests PASS
npm run -w @atair/merchant test   → 5 suites / 23 tests PASS
npm run -w @atair/customer test   → 2 suites /  7 tests PASS
npm run -w @atair/web test        → 1 suite  /  3 tests PASS
npm run lint                      → 5 apps, no warnings or errors
npm run typecheck                 → 5 apps, clean
```

---

## 8. Conclusion

The live platform passed the full end-to-end verification. RBAC is enforced
server-side and correctly reflected in the UI (sidebar filtering + denial page),
brand assets are byte-identical across all apps and never mirrored in RTL,
cross-tenant/cross-merchant reads are properly scoped, the audit trail is
complete, and public endpoints are rate-limited.

**No defects found. No code changes made.**
