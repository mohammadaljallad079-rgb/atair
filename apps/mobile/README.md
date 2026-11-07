# ATAIR Mobile Platform (Flutter)

Three Android apps plus one shared Dart package, all Arabic-first (RTL) and
pointed at the same NestJS API as the web apps.

| App | Package name | API surface | Role gate |
| --- | --- | --- | --- |
| `atair_customer` | `store.sumu.atair_customer` | `/api/v1/customer/*` | `customer` |
| `atair_driver` | `store.sumu.atair_driver` | `/api/v1/driver/*` | `driver` |
| `atair_merchant` | `store.sumu.atair_merchant` | `/api/v1/merchant/*` | `merchant_owner`, `merchant` |
| `atair_core` | — (library) | — | — |

## Why a shared package

`atair_core` holds everything the three apps have in common so there is one
place to fix API/session behaviour:

- `ApiClient` — unwraps the `{ success, data, meta? }` envelope, attaches the
  in-memory access token, and refreshes it **once** (single-flight) before
  retrying a 401. Mirrors the web clients; the refresh token is single-use and
  rotated server-side.
- `SessionStore` — refresh token in `flutter_secure_storage` (Android Keystore)
  and the last-known user in `shared_preferences`; the access token lives in
  memory only.
- `AuthController` — `bootstrap()` / `login()` / `logout()` and a client-side
  role gate for a clear error (the backend boundary guards stay authoritative).
- `LocaleController` + `context.tr()` — ar/en dictionaries with a persisted
  choice; direction follows the locale (ar → RTL, en → LTR). Each app layers
  its own keys over the core defaults via `registerStrings()`.
- `AtairAppRoot` — the shared `MaterialApp` root (locale scope, RTL/LTR,
  boot spinner, login gate); an app passes its authenticated shell via
  `builder:`.
- `AtairTrackingMap` — a `flutter_map` view that fits pickup/dropoff/driver
  points and degrades to an explanatory message when no tile provider is
  configured.
- `AtairApi` — typed endpoint facade grouped by principal.
- `AtairTheme`, `AtairFormat`, `AtairLoginScreen`, shared widgets.

## Localization

All user-facing text is resolved through `context.tr('some.key')`; the ar/en
dictionaries live in `atair_core/lib/src/l10n.dart` plus each app's
`lib/i18n.dart`. Register app strings in `main()` before `runApp`:

```dart
void main() {
  registerDriverStrings();
  runApp(const AtairDriverApp());
}
```

The login screen (and every shell) exposes a language toggle; the choice is
persisted and the layout direction flips with it.

## Maps

`AtairMapConfig` reads the tile URL from a build-time define. Without it the
tracking screen still shows addresses and status — it just explains that no map
provider is configured, instead of rendering a broken map.

```
--dart-define=ATAIR_MAP_TILE_URL=https://tile.example.com/{z}/{x}/{y}.png
```


## Configuration

The API base URL is injected at build time (defaults to production):

```
--dart-define=ATAIR_API_BASE=https://admin.sumu-app.store/api/v1
```

`ATAIR_TENANT_SLUG` is optional: pass it only when a login identifier exists in
more than one tenant (the server returns `TENANT_REQUIRED` otherwise).

## Build & test

Flutter's Android Gradle Plugin requires **JDK 17**; a JDK 21 `JAVA_HOME` fails
with a `JdkImageTransform`/`jlink` error. Point `JAVA_HOME` at a JDK 17 install
and pin it for Flutter once with `flutter config --jdk-dir="$JAVA_HOME"`.

```bash
export PATH="$FLUTTER_HOME/bin:$PATH"
export ANDROID_HOME=/path/to/android-sdk
export JAVA_HOME=/path/to/jdk-17
flutter config --jdk-dir="$JAVA_HOME"

# shared package
cd apps/mobile/atair_core && flutter pub get && flutter test

# each app
cd apps/mobile/atair_driver
flutter pub get
flutter analyze
flutter test
flutter build apk --release --dart-define=ATAIR_API_BASE=https://admin.sumu-app.store/api/v1
```

Release artifacts land in `build/app/outputs/flutter-apk/app-release.apk`.

## Backend contract notes

- Login: `POST /auth/login { identifier, password, tenantSlug }` → `{ user, accessToken, refreshToken, expiresIn }`.
- Envelope: success `{ success:true, data, meta? }`; errors `{ success:false, error:{ code, message } }` — surfaced as `ApiException(code)`.
- Customer registration: `POST /customer/auth/register` (public).
- Driver assignment responses: `POST /driver/assignments/:id/accept|reject`.
- Driver status progression is forward-only through the `OrderStateMachine`.
