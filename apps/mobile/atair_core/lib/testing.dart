/// Test helpers for the ATAIR mobile apps.
///
/// Exposed from a separate entry point (`package:atair_core/testing.dart`) so
/// test-only code never lands in the shipped app bundle.
library;

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'src/l10n.dart';
import 'src/theme.dart';

/// Redirects `shared_preferences` to an in-memory map for tests.
///
/// `LocaleController` and `SessionStore` both persist through
/// `shared_preferences`; without this the platform channel is missing under
/// `flutter test` and the first write throws. Call once in `setUp` so apps do
/// not need a direct dependency on `shared_preferences` just for testing.
void useInMemoryPreferences([Map<String, Object> initial = const {}]) {
  // This helper exists solely for tests; the annotation is what the analyzer
  // expects for `setMockInitialValues`.
  // ignore: invalid_use_of_visible_for_testing_member
  SharedPreferences.setMockInitialValues(initial);
}

/// Redirects `flutter_secure_storage` to an in-memory map for tests.
///
/// `SessionStore` writes the refresh token through secure storage; the real
/// implementation talks to the Android Keystore / iOS Keychain platform
/// channel, which is absent under `flutter test`.
void useInMemorySecureStorage([Map<String, String> initial = const {}]) {
  // `setMockInitialValues` keeps the map by reference and writes into it, so it
  // must be mutable (a `const {}` default would throw on the first write).
  // ignore: invalid_use_of_visible_for_testing_member
  FlutterSecureStorage.setMockInitialValues({...initial});
}

/// Wraps a widget in the same locale scope + theme the apps use at runtime, so
/// widget tests exercise the real localization path instead of a bare
/// `MaterialApp` (which would leave `AtairL10n` missing).
///
/// [rtl] picks the initial locale; `false` selects English/LTR.
Widget atairTestApp(Widget child, {bool rtl = true}) {
  final controller = LocaleController(
    initial: rtl ? AtairLocale.arabic : AtairLocale.english,
  );
  return AtairL10n(
    controller: controller,
    child: MaterialApp(
      theme: AtairTheme.light(),
      locale: controller.locale.locale,
      builder: (context, widget) => Directionality(
        textDirection: controller.direction,
        child: widget ?? const SizedBox.shrink(),
      ),
      home: child,
    ),
  );
}
