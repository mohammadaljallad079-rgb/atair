import { formatMoney, formatNumber, formatDistance, formatDate } from './format';

describe('formatMoney', () => {
  it('formats a Prisma Decimal string without losing precision', () => {
    const out = formatMoney('1234.50', 'SAR', 'en');
    expect(out).toContain('1,234.5');
  });

  it('falls back to zero for null/undefined/NaN input', () => {
    expect(formatMoney(null, 'SAR', 'en')).toContain('0');
    expect(formatMoney(undefined, 'SAR', 'en')).toContain('0');
    expect(formatMoney('not-a-number', 'SAR', 'en')).toContain('0');
  });
});

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
  });
});

describe('formatDistance', () => {
  it('returns an em dash for missing distance', () => {
    expect(formatDistance(null, 'en')).toBe('—');
    expect(formatDistance('', 'en')).toBe('—');
  });

  it('appends the unit for a numeric value', () => {
    expect(formatDistance('12.345', 'en')).toContain('km');
  });
});

describe('formatDate', () => {
  it('returns an em dash for invalid dates', () => {
    expect(formatDate('not-a-date', 'en')).toBe('—');
    expect(formatDate(null, 'en')).toBe('—');
  });
});
