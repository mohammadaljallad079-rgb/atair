#!/usr/bin/env bash
# Builds all six Android release artifacts (APK + AAB for the three apps).
# Run from apps/mobile with the toolchain env sourced (see env.sh).
set -u
API="https://admin.sumu-app.store/api/v1"
cd "$(dirname "$0")"

build_one() {
  local app="$1"
  echo "===== $app ====="
  (cd "$app" \
    && flutter build apk --release --dart-define=ATAIR_API_BASE="$API" \
    && flutter build appbundle --release --dart-define=ATAIR_API_BASE="$API") \
    || { echo "FAILED: $app"; return 1; }
  echo "OK: $app"
}

for app in atair_customer atair_driver atair_merchant; do
  build_one "$app" || exit 1
done
echo "ALL BUILDS DONE"
