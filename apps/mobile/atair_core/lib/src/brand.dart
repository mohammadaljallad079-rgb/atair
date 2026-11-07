import 'package:flutter/material.dart';

/// The official عَ الطاير brand mark, shipped once from `atair_core` so all
/// three apps render the *same* asset — never a redrawn or recolored copy.
///
/// The artwork is the supplied logo (`public/assets/brand/logo-*.png`), copied
/// byte-for-byte into this package's `assets/brand/`. It is never mirrored in
/// RTL: only the surrounding layout flips, the image itself stays as-is.
enum BrandLogoVariant {
  /// Bird + Arabic wordmark — login and branding moments.
  full,

  /// Bird only — app bars and compact marks.
  mark,
}

class BrandLogo extends StatelessWidget {
  const BrandLogo({
    super.key,
    this.variant = BrandLogoVariant.mark,
    this.height = 32,
    this.semanticLabel = 'عَ الطاير',
  });

  final BrandLogoVariant variant;
  final double height;
  final String semanticLabel;

  // Assets declared in *this* package are exposed to a consuming app under the
  // `packages/<name>/` prefix, so the prefix is required here — a bare
  // `assets/brand/...` path silently misses and falls through to the icon.
  static const String _fullAsset = 'packages/atair_core/assets/brand/logo-full.png';
  static const String _markAsset = 'packages/atair_core/assets/brand/logo-mark.png';

  /// Asset path for a variant, so tests can assert the packaged artwork.
  static String assetFor(BrandLogoVariant variant) =>
      variant == BrandLogoVariant.full ? _fullAsset : _markAsset;

  @override
  Widget build(BuildContext context) {
    // The logo must never be mirrored when the UI is in RTL.
    return Semantics(
      label: semanticLabel,
      image: true,
      child: Directionality(
        textDirection: TextDirection.ltr,
        child: Image.asset(
          assetFor(variant),
          height: height,
          fit: BoxFit.contain,
          filterQuality: FilterQuality.high,
          errorBuilder: (context, error, stack) => _fallback(context),
        ),
      ),
    );
  }

  Widget _fallback(BuildContext context) => Icon(
        Icons.local_shipping_outlined,
        size: height,
        color: Theme.of(context).colorScheme.primary,
      );
}

/// Full-screen branded splash shown while the session is restored.
///
/// Uses the official logo on the brand gradient so the first frame already
/// carries the identity, then hands off to the login/home tree.
class BrandSplash extends StatelessWidget {
  const BrandSplash({super.key, this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFF7ED), Color(0xFFFFFFFF)],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const BrandLogo(variant: BrandLogoVariant.full, height: 150),
            const SizedBox(height: 24),
            const SizedBox(
              width: 26,
              height: 26,
              child: CircularProgressIndicator(strokeWidth: 2.4, color: Color(0xFFF97316)),
            ),
            if (label != null) ...[
              const SizedBox(height: 14),
              Text(label!, style: const TextStyle(color: Color(0xFF64748B))),
            ],
          ],
        ),
      ),
    );
  }
}
