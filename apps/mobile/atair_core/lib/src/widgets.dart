import 'package:flutter/material.dart';

import 'brand.dart';
import 'l10n.dart';
import 'theme.dart';

/// Branded app bar with the ATAIR bird mark.
class AtairAppBar extends StatelessWidget implements PreferredSizeWidget {
  const AtairAppBar({super.key, required this.title, this.actions, this.leading});

  final String title;
  final List<Widget>? actions;
  final Widget? leading;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      titleSpacing: 8,
      leading: leading,
      title: Row(
        children: [
          const _BirdMark(),
          const SizedBox(width: 8),
          Flexible(child: Text(title, overflow: TextOverflow.ellipsis)),
        ],
      ),
      actions: actions,
    );
  }
}

/// Small AR/EN switch placed in app bars so the language is reachable from
/// every screen without a settings detour.
class LanguageToggleButton extends StatelessWidget {
  const LanguageToggleButton({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AtairL10n.maybeOf(context);
    if (l10n == null) return const SizedBox.shrink();
    return IconButton(
      icon: Text(
        l10n.isRtl ? 'EN' : 'ع',
        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15),
      ),
      tooltip: l10n.t('common.language'),
      onPressed: l10n.toggle,
    );
  }
}

class _BirdMark extends StatelessWidget {
  const _BirdMark();

  @override
  Widget build(BuildContext context) {
    return const SizedBox(
      width: 32,
      height: 32,
      child: Center(child: BrandLogo(variant: BrandLogoVariant.mark, height: 28)),
    );
  }
}

/// Full-screen centered loading state.
class LoadingView extends StatelessWidget {
  const LoadingView({super.key, this.label});
  final String? label;

  @override
  Widget build(BuildContext context) {
    final l10n = AtairL10n.maybeOf(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(color: AtairTheme.brand),
          const SizedBox(height: 12),
          Text(label ?? l10n?.t('common.loading') ?? 'Loading…',
              style: const TextStyle(color: AtairTheme.textMuted)),
        ],
      ),
    );
  }
}

/// Error state with a retry action.
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, this.onRetry});
  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AtairL10n.maybeOf(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 44, color: Colors.redAccent),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 16),
              OutlinedButton(onPressed: onRetry, child: Text(l10n?.t('common.retry') ?? 'Retry')),
            ],
          ],
        ),
      ),
    );
  }
}

/// Empty state placeholder.
class EmptyView extends StatelessWidget {
  const EmptyView({super.key, this.message, this.icon = Icons.inbox_outlined});
  final String? message;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final l10n = AtairL10n.maybeOf(context);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 46, color: const Color(0xFFCBD5E1)),
          const SizedBox(height: 10),
          Text(message ?? l10n?.t('common.noData') ?? 'No data',
              style: const TextStyle(color: AtairTheme.textMuted)),
        ],
      ),
    );
  }
}

/// Colored status pill matching the web `StatusBadge` palette.
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
        ),
      );
}

Color statusColor(String status) {
  switch (status) {
    case 'delivered':
    case 'approved':
    case 'active':
    case 'online':
    case 'paid':
      return const Color(0xFF16A34A);
    case 'cancelled':
    case 'failed_delivery':
    case 'rejected':
    case 'suspended':
    case 'failed':
      return const Color(0xFFDC2626);
    case 'in_transit':
    case 'picked_up':
    case 'arriving':
    case 'driver_arriving':
    case 'assigned':
      return AtairTheme.ink;
    case 'pending':
    case 'searching_driver':
    case 'draft':
      return const Color(0xFFD97706);
    default:
      return AtairTheme.textMuted;
  }
}

/// Simple labelled metric tile used across dashboards.
class MetricTile extends StatelessWidget {
  const MetricTile({super.key, required this.label, required this.value, this.icon, this.color});
  final String label;
  final String value;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? AtairTheme.brand;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18, color: c),
                  const SizedBox(width: 6),
                ],
                Expanded(
                  child: Text(
                    label,
                    style: const TextStyle(fontSize: 12, color: AtairTheme.textMuted),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: c),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
