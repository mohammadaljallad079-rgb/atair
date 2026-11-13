#!/usr/bin/env bash
# Prepares the three iOS Runner projects for archiving on a Mac.
#
# The iOS projects are generated on Linux, which cannot run CocoaPods or
# Xcode. This script does the machine-independent half (Flutter package
# resolution + plugin registration); `pod install` and the actual archive are
# Xcode-only steps documented in SIGNING.md.
#
# Requires: macOS, Xcode, CocoaPods, and the Flutter SDK on PATH.
set -u
cd "$(dirname "$0")"

for app in atair_customer atair_driver atair_merchant; do
  echo "===== $app ====="
  (cd "$app" && flutter pub get && (cd ios && pod install --repo-update)) \
    || { echo "FAILED: $app"; exit 1; }
  echo "OK: $app  ->  open $app/ios/Runner.xcworkspace"
done
echo "ALL IOS PROJECTS READY"
