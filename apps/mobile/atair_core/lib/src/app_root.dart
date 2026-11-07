import 'package:flutter/material.dart';

import 'auth_controller.dart';
import 'brand.dart';
import 'l10n.dart';
import 'login_screen.dart';
import 'theme.dart';

/// Shared application root for the three ATAIR mobile apps.
///
/// Owns the [LocaleController] (ar/en, persisted) and the [AuthController],
/// rebuilds on locale changes so the whole tree flips between RTL and LTR, and
/// delegates the authenticated/unauthenticated split to the caller.
///
/// Keeping this in `atair_core` means the customer, driver and merchant apps
/// cannot drift apart on direction, localization or session handling.
class AtairAppRoot extends StatefulWidget {
  const AtairAppRoot({
    super.key,
    required this.auth,
    required this.titleKey,
    required this.subtitleKey,
    required this.builder,
    this.accent = AtairTheme.brand,
    this.loginFooter,
    this.guestBuilder,
  });

  final AuthController auth;

  /// Translation keys resolved through the locale controller.
  final String titleKey;
  final String subtitleKey;

  /// Builds the authenticated shell for a signed-in user.
  final Widget Function(BuildContext context, AuthController auth) builder;

  final Color accent;

  /// Optional extra content under the login button (e.g. a register link).
  final Widget Function(BuildContext context)? loginFooter;

  /// Builds the public (guest) shell. When null the app has no guest mode and
  /// the login screen shows no "Continue as guest" action.
  final Widget Function(BuildContext context, AuthController auth)? guestBuilder;

  @override
  State<AtairAppRoot> createState() => _AtairAppRootState();
}

class _AtairAppRootState extends State<AtairAppRoot> {
  final LocaleController _locale = LocaleController();

  @override
  void initState() {
    super.initState();
    _locale.load();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _locale,
      builder: (context, _) {
        return AtairL10n(
          controller: _locale,
          child: MaterialApp(
            debugShowCheckedModeBanner: false,
            theme: AtairTheme.light(),
            locale: _locale.locale.locale,
            builder: (context, child) => Directionality(
              textDirection: _locale.direction,
              child: child ?? const SizedBox.shrink(),
            ),
            home: AnimatedBuilder(
              animation: widget.auth,
              builder: (context, _) {
                if (widget.auth.booting) {
                  return Scaffold(body: BrandSplash(label: _locale.t(widget.titleKey)));
                }
                if (widget.auth.isAuthenticated) {
                  return widget.builder(context, widget.auth);
                }
                if (widget.auth.isGuest && widget.guestBuilder != null) {
                  return widget.guestBuilder!(context, widget.auth);
                }
                return AtairLoginScreen(
                  auth: widget.auth,
                  appTitle: _locale.t(widget.titleKey),
                  subtitle: _locale.t(widget.subtitleKey),
                  accent: widget.accent,
                  footer: widget.loginFooter?.call(context),
                  onGuest: widget.guestBuilder == null
                      ? null
                      : () => widget.auth.continueAsGuest(),
                );
              },
            ),
          ),
        );
      },
    );
  }
}
