# ATAIR mobile — signing & store delivery

Three apps, all in this folder:

| App | Android `applicationId` | iOS bundle id | Play/App Store name |
|---|---|---|---|
| `atair_customer` | `store.sumu.atair_customer` | `store.sumu.atair.customer` | عَ الطاير |
| `atair_driver` | `store.sumu.atair_driver` | `store.sumu.atair.driver` | عَ الطاير — السائق |
| `atair_merchant` | `store.sumu.atair_merchant` | `store.sumu.atair.merchant` | عَ الطاير — التاجر |

> Android ids keep the underscores they were first published with; iOS ids use
> dots because Apple bundle ids cannot contain `_`. Keep them as-is.

## Android — signed AAB (Play upload)

The release build is signed with an **upload key** when
`<app>/android/key.properties` exists. That file and the keystore are
**git-ignored** and must never be committed.

### 1. Keystore

A keystore is generated outside the repo (kept out of git on purpose):

```
apps/mobile/android-keys/atair-upload.p12   # PKCS12, alias "atair", 10000 days
apps/mobile/android-keys/.storepass         # the store/key password (mode 600)
```

`key.properties` (one per app) points at it:

```properties
storePassword=<the password>
keyPassword=<the password>
keyAlias=atair
storeFile=../../../android-keys/atair-upload.p12
```

**Back the keystore and password up somewhere safe and private.** If you lose
the upload key you must ask Google to reset it; if it leaks, anyone can publish
as you. This environment generated a fresh key, so treat this as the project's
real key from now on.

### 2. Build

```bash
cd apps/mobile
source env.sh
cd atair_customer && flutter build appbundle --release \
  --dart-define=ATAIR_API_BASE=https://admin.sumu-app.store/api/v1
```

Output: `build/app/outputs/bundle/release/app-release.aab`.
`build_all.sh` builds all three (APK + AAB). Prebuilt AABs and `SHA256SUMS.txt`
are placed in `dist-mobile/aab/` (git-ignored).

### 3. Verify before uploading

```bash
jarsigner -verify build/app/outputs/bundle/release/app-release.aab   # -> jar verified
keytool -printcert -jarfile build/app/outputs/bundle/release/app-release.aab
```

The certificate SHA-256 must match the keystore. If the build silently fell back
to the **debug** key, `key.properties` was missing or `storeFile` was wrong —
fix and rebuild; a debug-signed AAB is rejected by Play.

### 4. Play Console

- Upload the `.aab` to Internal testing first.
- Enable **Play App Signing** (recommended) and keep the upload key here.
- `versionCode` comes from `pubspec.yaml` (`1.0.0+1`). **Bump `+N` for every
  upload** or Play rejects the build.

## iOS — project + archive

The `ios/` Runner projects are committed and configured (bundle id, Arabic
display name, ar/en localizations, iOS 13 target, AppIcon set generated from the
official logo). `Podfile` is present. Two steps still require a Mac.

### On a Mac

```bash
cd apps/mobile
./ios_setup.sh          # flutter pub get + pod install for all three
```

Then for each app:

1. Open `<app>/ios/Runner.xcworkspace` in Xcode.
2. Select the **Runner** target → *Signing & Capabilities* → choose your Apple
   Developer **Team** (Automatic signing).
3. Confirm the bundle id (`store.sumu.atair.<role>`) is registered in
   App Store Connect.
4. `flutter build ipa --release --dart-define=ATAIR_API_BASE=https://admin.sumu-app.store/api/v1`
   or Xcode → *Product → Archive → Distribute*.
5. Upload to App Store Connect (Transporter or Xcode).

### Apple requirements checklist

- An **Apple Developer Program** membership and an app record per bundle id.
- `NSCameraUsageDescription` / location strings are already covered by the
  Flutter plugins' podspecs; add any missing usage strings to `Info.plist` if
  App Store review flags them.
- Arabic app names show correctly because `CFBundleLocalizations` declares
  `ar` + `en`.
