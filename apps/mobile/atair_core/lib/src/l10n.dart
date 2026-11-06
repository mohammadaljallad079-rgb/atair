import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Lightweight ar/en localization for the ATAIR mobile apps.
///
/// Deliberately a plain string map rather than generated ARB — the mobile
/// surface is small and the web apps already ship a hand-written dictionary
/// (`src/i18n/dictionary.ts`), so this keeps one mental model across the stack.
///
/// Arabic is the default; the chosen locale persists in `shared_preferences`
/// and drives both the text and the text direction (ar → RTL, en → LTR).
class AtairLocale {
  const AtairLocale._(this.code);
  final String code;

  static const arabic = AtairLocale._('ar');
  static const english = AtairLocale._('en');

  static const all = [arabic, english];

  bool get isRtl => code == 'ar';
  TextDirection get direction => isRtl ? TextDirection.rtl : TextDirection.ltr;
  Locale get locale => Locale(code);

  @override
  bool operator ==(Object other) => other is AtairLocale && other.code == code;

  @override
  int get hashCode => code.hashCode;
}

/// Holds the active locale, persists it, and looks up translated strings.
class LocaleController extends ChangeNotifier {
  LocaleController({AtairLocale initial = AtairLocale.arabic}) : _locale = initial;

  static const _kLocale = 'atair.locale';

  AtairLocale _locale;
  AtairLocale get locale => _locale;
  TextDirection get direction => _locale.direction;
  bool get isRtl => _locale.isRtl;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString(_kLocale);
    if (code == 'en') {
      _locale = AtairLocale.english;
    } else if (code == 'ar') {
      _locale = AtairLocale.arabic;
    }
    notifyListeners();
  }

  Future<void> set(AtairLocale value) async {
    if (value == _locale) return;
    _locale = value;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kLocale, value.code);
  }

  Future<void> toggle() => set(_locale.isRtl ? AtairLocale.english : AtairLocale.arabic);

  /// Translate [key]; falls back to Arabic, then to the key itself so a missing
  /// translation is visible rather than blank.
  String t(String key, [Map<String, String>? params]) {
    final table = _strings[_locale.code] ?? const <String, String>{};
    var value = table[key] ?? _strings['ar']![key] ?? key;
    if (params != null) {
      params.forEach((k, v) => value = value.replaceAll('{$k}', v));
    }
    return value;
  }
}

/// Shared strings used by the core widgets (login, loading, errors). Each app
/// layers its own additional keys on top via [registerStrings].
final Map<String, Map<String, String>> _strings = {
  'ar': {
    'app.brand': 'عَ الطاير',
    'common.retry': 'إعادة المحاولة',
    'common.loading': 'جارٍ التحميل…',
    'common.noData': 'لا توجد بيانات',
    'common.cancel': 'إلغاء',
    'common.save': 'حفظ',
    'common.error': 'حدث خطأ غير متوقع',
    'common.logout': 'تسجيل الخروج',
    'common.language': 'اللغة',
    'common.arabic': 'العربية',
    'common.english': 'English',
    'login.identifier': 'البريد أو الجوال',
    'login.password': 'كلمة المرور',
    'login.submit': 'تسجيل الدخول',
    'login.failed': 'تعذّر تسجيل الدخول، حاول مرة أخرى',
    'login.roleDenied': 'هذا الحساب غير مصرّح له بالدخول إلى هذا التطبيق',
    'guest.continue': 'المتابعة كزائر',
    'guest.badge': 'وضع الزائر',
    'guest.signIn': 'تسجيل الدخول',
    'guest.requiresLogin': 'هذه العملية تتطلّب تسجيل الدخول',
    'net.timeout': 'انتهت مهلة الاتصال بالخادم',
    'net.error': 'تعذّر الاتصال بالخادم',
    'tracking.title': 'تتبّع الطلب',
    'tracking.driverAvailable': 'الموقع الحالي للسائق متاح',
    'tracking.driverUnavailable': 'لم يُبلّغ السائق عن موقعه بعد',
    'tracking.route': 'إحداثيات المسار',
    'tracking.pickup': 'الاستلام',
    'tracking.dropoff': 'التسليم',
    'tracking.driver': 'السائق',
    'map.title': 'الخريطة',
    'map.noCoordinates': 'لا تتوفّر إحداثيات لعرضها على الخريطة',
    'map.notConfigured': 'لم يتم إعداد مزوّد الخرائط',
  },
  'en': {
    'app.brand': 'Al-Tayer',
    'common.retry': 'Retry',
    'common.loading': 'Loading…',
    'common.noData': 'No data',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.error': 'Something went wrong',
    'common.logout': 'Log out',
    'common.language': 'Language',
    'common.arabic': 'العربية',
    'common.english': 'English',
    'login.identifier': 'Email or phone',
    'login.password': 'Password',
    'login.submit': 'Sign in',
    'login.failed': 'Could not sign in, please try again',
    'login.roleDenied': 'This account is not allowed to use this app',
    'guest.continue': 'Continue as guest',
    'guest.badge': 'Guest mode',
    'guest.signIn': 'Sign in',
    'guest.requiresLogin': 'This action requires signing in',
    'net.timeout': 'The server took too long to respond',
    'net.error': 'Could not reach the server',
    'tracking.title': 'Order tracking',
    'tracking.driverAvailable': 'Driver location available',
    'tracking.driverUnavailable': 'The driver has not reported a location yet',
    'tracking.route': 'Route coordinates',
    'tracking.pickup': 'Pickup',
    'tracking.dropoff': 'Drop-off',
    'tracking.driver': 'Driver',
    'map.title': 'Map',
    'map.noCoordinates': 'No coordinates available to show on the map',
    'map.notConfigured': 'No map provider is configured',
  },
};

/// Extra strings contributed by an app, merged over the core defaults.
void registerStrings(Map<String, Map<String, String>> extra) {
  extra.forEach((code, table) {
    _strings[code] = {...?_strings[code], ...table};
  });
}

/// Convenience: expose the shared translation map for tests.
Map<String, String> sharedStrings(String code) => _strings[code] ?? const {};

/// Makes the [LocaleController] available to the widget tree, so any screen can
/// read `AtairL10n.of(context).t('some.key')` and rebuild on a locale change.
class AtairL10n extends InheritedNotifier<LocaleController> {
  const AtairL10n({super.key, required LocaleController controller, required super.child})
      : super(notifier: controller);

  static LocaleController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AtairL10n>();
    assert(scope != null, 'AtairL10n is missing from the widget tree');
    return scope!.notifier!;
  }

  /// Nullable lookup for widgets that may be built outside the scope (tests).
  static LocaleController? maybeOf(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AtairL10n>()?.notifier;
}

/// Terse accessor: `context.l10n.t('key')` / `context.l10n.direction`.
extension AtairL10nContext on BuildContext {
  LocaleController get l10n => AtairL10n.of(this);
  LocaleController? get l10nOrNull => AtairL10n.maybeOf(this);
  bool get isRtl => AtairL10n.maybeOf(this)?.isRtl ?? true;
  TextDirection get direction => AtairL10n.maybeOf(this)?.direction ?? TextDirection.rtl;

  /// Shorthand for `context.l10n.t(key)`.
  String tr(String key, [Map<String, String>? params]) =>
      AtairL10n.maybeOf(this)?.t(key, params) ?? key;
}
