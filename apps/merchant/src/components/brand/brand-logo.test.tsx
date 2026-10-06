import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@/i18n/provider';
import { BrandLogo } from './brand-logo';

function renderWithI18n(ui: React.ReactElement) {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('BrandLogo', () => {
  it('renders the official bird mark with a webp source and Arabic alt in navigation variant', () => {
    const { container } = renderWithI18n(<BrandLogo variant="navigation" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('/assets/brand/logo-mark.png');
    expect(img.getAttribute('alt')).toBe('عَ الطاير');
    const source = container.querySelector('source');
    expect(source?.getAttribute('srcset')).toContain('/assets/brand/logo-mark.webp');
  });

  it('renders the full lockup for the login variant', () => {
    const { container } = renderWithI18n(<BrandLogo variant="login" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toContain('/assets/brand/logo-full.png');
    expect(container.querySelector('source')?.getAttribute('srcset')).toContain(
      '/assets/brand/logo-full.webp',
    );
  });

  it('uses the caller-provided subtitle and never applies a mirror transform', () => {
    renderWithI18n(<BrandLogo variant="navigation" subtitle="بوابة الأعمال" />);
    expect(screen.getByText('بوابة الأعمال')).toBeInTheDocument();
    expect(screen.getByRole('img')).not.toHaveStyle({ transform: 'scaleX(-1)' });
  });
});
