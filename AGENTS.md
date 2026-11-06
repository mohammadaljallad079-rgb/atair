# عَ الطاير (Al-Tayer) — Agent Notes

Integrated internal transport & last-mile delivery platform. Monorepo (npm workspaces).

## Layout
- `apps/api` — NestJS + Prisma REST API.
- `apps/admin` — Admin Control Center: Next.js 14 App Router + TS + Tailwind, RTL Arabic (LTR English), dev/start port **3001**.
- `apps/merchant` — Merchant / Business Portal: Next.js 14 App Router + TS + Tailwind, RTL Arabic (LTR English), dev/start port **3002**. Consumes only `/api/v1/merchant/*` (plus `/auth/*`); a pure merchant principal is blocked from tenant-wide routes by `MerchantBoundaryGuard`.
- `apps/customer` — Customer Application: Next.js 14 App Router + TS + Tailwind, RTL Arabic (LTR English), dev/start port **3003**. Consumes only `/api/v1/customer/*` (plus `/auth/*`); a pure customer principal is blocked from tenant-wide routes by `CustomerBoundaryGuard`. Same-origin by default: `next.config.mjs` rewrites `/api/:path*` to `API_PROXY_TARGET` (default `http://localhost:3000`).
- `apps/web` — Public website (marketing) + public order tracking: Next.js 14 App Router + TS + Tailwind, RTL Arabic (LTR English), dev/start port **3004**. Fully anonymous — no auth, no session, no tokens. Consumes only `/api/v1/public/*` (`public-site` module): branding/content settings, active service areas, secure tracking by code, and a contact form that persists as a support ticket. Same-origin rewrite to `API_PROXY_TARGET` like the other apps. `robots.ts` + `sitemap.ts` live in `src/app/`.
- `packages/db` — Prisma schema, migrations, seed, and shared `@atair/db` package (exports `PrismaClient` + `PERMISSIONS`).
- `apps/mobile` — Flutter Android platform (NOT an npm workspace): `atair_core` (shared library) + `atair_customer`, `atair_driver`, `atair_merchant`. Each app is Arabic-first (RTL) and talks only to its own API surface (`/api/v1/customer/*`, `/driver/*`, `/merchant/*`) via the shared `AtairApi` facade; role gate enforced client-side by `AuthController.requiredRoles` (backend boundary guards stay authoritative). See `apps/mobile/README.md`.

## Commands (run from repo root)
- Install: `npm install`
- Prisma client: `npm run db:generate`
- Build db package: `npm run -w @atair/db build`
- Migrate: `npm run db:migrate` | Deploy: `npm run db:deploy`
- Seed: `npm run db:seed` (creates platform + `atair-demo` tenants, RBAC, demo users, Riyadh zone/pricing).
- API dev: `npm run api:dev` | Build: `npm run api:build`
- Typecheck (both apps): `npm run typecheck` | Lint (both apps): `npm run lint`
- API tests: `npm run api:test` | Admin tests: `npm run -w @atair/admin test` | Merchant tests: `npm run -w @atair/merchant test` | Customer tests: `npm run -w @atair/customer test` | Web tests: `npm run -w @atair/web test`
- Mobile (Flutter, from each app dir): `flutter pub get && flutter analyze && flutter test`. Release APK: `flutter build apk --release --dart-define=ATAIR_API_BASE=https://admin.sumu-app.store/api/v1`. Requires **JDK 17** (`flutter config --jdk-dir=<jdk17>`); JDK 21 breaks the Android build with a `JdkImageTransform`/`jlink` error.
- Admin dev: `npm run admin:dev` | Admin build: `npm run admin:build`
- Merchant dev: `npm run merchant:dev` | Merchant build: `npm run merchant:build`
- Customer dev: `npm run customer:dev` | Customer build: `npm run customer:build`
- Web dev: `npm run web:dev` | Web build: `npm run web:build`

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

## Customer app (apps/customer)
- Same Next.js App Router structure (`src/app`, `src/components`, `src/lib`, `src/i18n`); authenticated pages live under `src/app/(app)/*` behind `(app)/layout.tsx` (sidebar + app shell).
- API surface is `/api/v1/customer/*` only (see `src/lib/endpoints.ts`). The customer is resolved from the JWT — never sent by the client. The `customer` role carries only `orders.view` + `tracking.view`; `CustomerBoundaryGuard` blocks a customer-only principal from tenant-wide routes with `403`.
- `src/middleware.ts` gates on the non-sensitive `atair.customer.session` presence flag (public paths `/login`, `/register`); the access token stays in memory, refresh token in `localStorage` (`atair.customer.refreshToken`).
- Same-origin API: `next.config.mjs` rewrites `/api/:path*` to `API_PROXY_TARGET` (default `http://localhost:3000`); the browser calls the app's own origin, avoiding mixed content over HTTPS. `NEXT_PUBLIC_API_URL` overrides for a split origin.
- Design tokens are centralized in `tailwind.config.ts` / `globals.css` (`brand` orange + `ink` blue). Branding always goes through `src/components/brand/brand-logo.tsx`.

## Public website app (apps/web)
- Marketing site + public order tracking. Anonymous: no middleware auth gate, no session, no tokens — it only ever calls `/api/v1/public/*`.
- Content comes from the real backend (`PublicSiteService` reads whitelisted `website.*` `SystemSetting` rows) and is fetched once in `src/lib/site-provider.tsx`; pages fall back to built-in defaults when a key is unset. `useSetting(key, fallback)` is the accessor.
- `src/lib/api.ts` is a minimal fetch client with **no** credentials/refresh logic (unlike the other apps). Tracking code lives in the URL (`/track?code=...`) so it is shareable; `useSearchParams` is wrapped in `<Suspense>` (Next 14 requirement).
- Default website content is seeded idempotently by `seedWebsiteContent()` in `packages/db/prisma/seed.ts` (never overwrites existing rows). Edit keys from the Admin Control Center → Settings (generic key/value editor).

## Mobile platform (apps/mobile)
- Shared `atair_core` holds `ApiClient` (unwraps the `{success,data,meta?}` envelope, keeps the access token **in memory only**, single-flight refresh then **one** retry on 401), `SessionStore` (refresh token in `flutter_secure_storage`/Android Keystore, last-known user in `shared_preferences`), `AuthController` (`bootstrap`/`login`/`logout`, `requiredRoles` client-side gate), and `AtairApi` (typed endpoint facade grouped by principal).
- All UI strings go through `LocaleController` (`lib/src/l10n.dart`) + the `context.tr(key, [args])` extension; each app registers its own keys over the core defaults via `registerStrings()` in its `lib/i18n.dart`, called from `main()` **before** `runApp`. Direction follows the locale (ar → RTL, en → LTR). Never hardcode user-facing text in a screen.
- `AtairAppRoot` (`lib/src/app_root.dart`) owns the single `MaterialApp` for an app: locale scope, RTL/LTR `Directionality`, branded `BrandSplash` while booting, the login gate and the optional guest gate. Apps pass their authenticated shell through `builder:` and (customer only) a public shell through `guestBuilder:`.
- Customer registration posts to `/customer/auth/register` and the response already carries `{accessToken, refreshToken, user}` — `AuthController.register` persists that session directly. **Never** follow registration with a separate `login()` call: it is a redundant round-trip that can be throttled and is the historical cause of "account created but the app stays on the login screen".
- Registration needs a tenant whenever the deployment has more than one active tenant (`TENANT_REQUIRED`); the server only auto-resolves a slug when exactly one active tenant exists. The register screen therefore reads `/customer/auth/config` and shows an organisation-code field only when `requiresTenantSlug` is true, and the value falls back to the `ATAIR_TENANT_SLUG` build define. Login is different: it resolves the tenant from a unique identifier, so it needs no slug.
- Client-side validation must mirror the API contract exactly. Registration requires a phone matching `^\+?[0-9]{7,15}$` and a password of ≥8 chars containing **both** a letter and a digit (`PASSWORD_RULE` server-side). The register screen checks both and reports the specific reason via a localized key; a length-only check lets a letter-only password reach the API and bounce with a raw English `BAD_REQUEST`.
- `SessionStore.save` treats the secure-storage write as best-effort (mirrors `load()`): a keystore failure keeps the in-memory session so a successful sign-in never fails because persistence did. Don't make the write fatal again.
- Branding goes through `BrandLogo` (`lib/src/brand.dart`, variants `full`/`mark`) which packages the official artwork from `assets/brand/` — copied byte-for-byte from `public/assets/brand/`. The logo subtree is forced `Directionality.ltr` so the artwork is **never mirrored** in RTL. Never inline the image, and never replace it with an emoji/icon. Because the assets are declared in `atair_core`, a consuming app resolves them under the **`packages/atair_core/`** prefix — a bare `assets/brand/...` path misses silently and `Image.asset` swaps in the fallback icon instead of failing loudly.
- The tracking widget uses `flutter_map`; the tile URL comes from `AtairMapConfig` (`--dart-define=ATAIR_MAP_TILE_URL=...`). When it is unset the widget renders an explanatory message rather than a blank or broken map — never hardcode a third-party tile endpoint.
- `flutter_secure_storage` 10.x requires **minSdk 23**; all three apps pin `minSdk = 23` in `android/app/build.gradle` (Flutter's default is 21).
- Widget tests use `atairTestApp(child)` + `useInMemoryPreferences()` + `useInMemorySecureStorage()` from `package:atair_core/testing.dart` — the app root's locale scope is required, a bare `MaterialApp` leaves `AtairL10n` missing, and `SessionStore` needs the secure-storage mock (it must be a **mutable** map; `setMockInitialValues` keeps the reference and writes into it).
- The customer app has a **guest mode**: `AtairAppRoot.guestBuilder` renders `GuestHomeScreen`, which reaches only the anonymous `/api/v1/public/*` surface (published service areas + tracking by opaque code). Guests can never hit a customer endpoint — `AuthController.isGuest` holds no session, and protected actions call `exitGuest()` to route back to sign-in. `guestBuilder` is null for the driver/merchant apps, so they have no guest entry point.
- Each app constructs `AuthController` with its own role list: customer `['customer']`, driver `['driver']`, merchant `['merchant_owner','merchant']`. The gate only produces a clear message — the backend `*BoundaryGuard` remains the security boundary.
- `ATAIR_API_BASE` is injected with `--dart-define` (defaults to the production API). `ATAIR_TENANT_SLUG` is **optional** — only send it when an identifier exists in more than one tenant, otherwise the server filters the account out.
- Driver status progression in the app mirrors the backend `DRIVER_TRANSITIONS` whitelist (forward-only); never send an arbitrary target status.
- Android release signing: each app's `android/app/build.gradle` reads `android/key.properties` when present and otherwise falls back to the debug key (so a build always succeeds but an unsigned artefact is never mistaken for a Play-ready one). `key.properties` and `local.properties` are git-ignored — never commit them.
- Reproducible local build: `source apps/mobile/env.sh` (JDK 17 + Android SDK + Flutter + pub cache paths), then `apps/mobile/build_all.sh` builds all six artefacts (APK + AAB for each app). Build one: `flutter build apk --release --dart-define=ATAIR_API_BASE=https://admin.sumu-app.store/api/v1`.

## API conventions
- Global prefix `/api`, URI versioning (default `v1`) → routes are `/api/v1/...`. Swagger at `/api/docs`.
- Response envelope: success `{ success:true, data, meta? }`; errors `{ success:false, error:{ code, message, details? } }` (see `common/errors/app-error.ts`).
- Global providers (in `app.module.ts`): ThrottlerGuard → JwtAuthGuard → MerchantBoundaryGuard → CustomerBoundaryGuard → DriverBoundaryGuard → PermissionsGuard; Transform + Audit interceptors; AllExceptionsFilter.
- Tenant comes from the signed JWT (`AuthUser.tenantId`), never from client input. All queries must be tenant-scoped.
- `@Public()` bypasses auth (login/refresh/health). `@RequirePermissions([...])` enforces RBAC; platform admins bypass.
- DTOs use class-validator + `@nestjs/swagger`. ValidationPipe is `whitelist + forbidNonWhitelisted`, so unknown body fields are rejected.
- Update bodies MUST be declared with `PartialType(X)` (`@nestjs/swagger`), never the built-in `Partial<X>`. `Partial<>` is a compile-time-only alias: it erases to `Object` in the emitted `design:paramtypes` metadata, and NestJS skips validation for built-in metatypes — so the whole body becomes unvalidated and mass-assignable. Services must also pick fields explicitly instead of spreading the body into Prisma. Regression guard: `src/common/dto/body-metatype.spec.ts`.

## Prisma gotchas
- Compound unique keys containing a nullable column (e.g. `Role.tenantId_slug`, `VehicleType.tenantId_slug`, `ServiceZone.tenantId_code`) CANNOT be used in `upsert({ where })` when the nullable part is `null`. Use `findFirst` + `update`/`create` instead (see `packages/db/prisma/seed.ts`).
- `@atair/db` resolves in `apps/api` via `tsconfig.paths` → `../../packages/db/dist/index.d.ts` (declarations only) so `nest build` emits to `apps/api/dist/main.js`. Run `npm run -w @atair/db build` before typechecking/building the API.

## Domain notes
- Reports extras (added for the Admin dashboard, all `reports.view`): `GET /reports/timeseries?preset|from|to&bucket=day|hour` → `[{bucket, orders, revenue}]`; `GET /reports/operations` → `{unassignedOrders, activeOrders, availableDrivers, busyDrivers, onlineDrivers}`.
- List filters: `GET /orders` accepts `paymentStatus`; `GET /payments` accepts `status`, `method`, `merchantId`, `from`, `to` (plus pagination/search).
- Pricing is rule-driven from the DB (`PricingService` + `PricingEngine`); no hardcoded fares. Rules can be scoped by zone/merchant/vehicleType. Orders resolve the pickup service zone (polygon) before quoting.
- Order status is enforced by `OrderStateMachine` (single source of truth). Transition endpoint body field is `status` (not `to`).
- Driver wallet is credited on payment settlement (`PaymentsService.markPaid` → `WalletsService.creditForOrder`), idempotent per `order:<id>` reference.
- Public tracking uses `Order.trackingCode`: a 128-bit opaque, non-sequential secret assigned on order create (`OrdersService.generateTrackingCode`). The public lookup is by code only (never id) and returns a minimal, PII-free snapshot. Never expose phone numbers, driver ids, or customer identities from the public surface.

## Local env
- Copy `apps/api/.env.example` → `apps/api/.env`; `packages/db/.env` holds `DATABASE_URL`.
- Postgres runs in Docker container `atair-postgres` (host port 5432).

## Audit & security logging
- `ActivityLog` (via `AuditService` / `AuthService.safeAudit`) records the business audit trail shown under `/audit`.
- `SecurityEvent` (`security_events`) is a separate, higher-signal feed surfaced at `/audit/security-events` (and the admin Audit page). Auth writes `auth.login_success`, `auth.login_failed` (warning), `auth.login_lockout` (high), and `auth.login_locked` via `AuthService.safeSecurityEvent` — keep this in sync when changing the login path, otherwise the screen silently shows nothing.

## Frontend auth / session pitfalls
- Both web apps keep the access token in memory and the opaque refresh token in `localStorage`. Refresh tokens are single-use and rotated server-side (`AuthService.refresh`).
- `refreshSession()` in `apps/{admin,merchant}/src/lib/api.ts` is single-flight, but a single-flight guard only covers one JS context. Two tabs (or a reload racing an in-flight request) can each POST the same token; the second gets 401 after the first rotated it. The client therefore retries once with the newest stored token before clearing the session. Do not "simplify" this back to a single attempt — it causes spurious logouts.
- Responsive dashboards: metric grids use `grid-cols-2`, so a `MetricCard` value must be allowed to shrink (`min-w-0` on the card + `break-words` on the value) or long Arabic money strings force horizontal page scroll on ~390px viewports.

## Pricing guard (zero-fare hole)
- `PricingService.quote` throws `409 PRICING_UNAVAILABLE` when `PricingEngine.selectRule` returns null. The order-create paths (admin + merchant) already guarded before persisting; the admin `/pricing/quote` preview is guarded too, and the admin pricing page renders `pricing.noRule` for that code. Never return a silent `total: 0` quote.
- Rules can be scoped by zone/merchant/vehicleType. `loadApplicableRules` matches only `null`-scoped rules unless the request carries the scope, so a zone-scoped rule (e.g. the seeded Riyadh rule) requires the caller to pass `zoneId` (or coordinates the server resolves to a zone).

## Brand asset (official)
- The supplied عَ الطاير logo is the **official project brand asset**. Do not replace, redesign, recolor, re-crop, or mirror it without explicit instruction.
- Source of truth: `public/assets/brand/logo-original.jpeg` (monorepo central copy, kept byte-for-byte identical to the supplied file). Never edit or overwrite it.
- Derived, faithful crops of the official art (generated once, not redrawn) live alongside it and in each app's `public/assets/brand/`:
  - `logo-full.{webp,png}` — bird + Arabic wordmark, used for login/branding moments.
  - `logo-mark.{webp,png}` — bird only, used for navigation/compact marks.
  - `favicon-32.png`, `favicon.ico` (16/32/48), `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (from `icon-180.png`) — app icons/favicons derived from the bird on its light-blue background. Regenerate reproducibly with `python3 public/assets/brand/make_assets.py`; never hand-drawn. The lockup/mark crops are emitted with a **transparent** background (the source light-blue gradient is alpha-matted, not chroma-keyed); the icon tile keeps a solid sampled gradient so it reads on any browser chrome.
  - Mobile app icons come from the same art via `python3 apps/mobile/make_icons.py`, which writes the Android legacy/round/adaptive (`mipmap-*`, `mipmap-anydpi-v26`, `drawable/ic_launcher_background.xml`) launcher icons and the Flutter web icons + `manifest.json` for all three apps. Never hand-edit those outputs.
- All UI branding goes through the shared `BrandLogo` component (`apps/{admin,merchant,customer,web}/src/components/brand/brand-logo.tsx`, variants `login | full | navigation | compact`). Do not inline the image in pages.
- The artwork must never be mirrored in RTL: only the surrounding layout flips (`dir`), never the logo (`transform` stays `none`).
- The route-guard middleware must keep excluding static file extensions (`png|jpg|jpeg|webp|svg|ico|gif`) so brand assets/favicons load on the public login screen.
