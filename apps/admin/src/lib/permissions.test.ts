import { permissionModule, permissionLabel } from './permissions';

describe('permissionModule', () => {
  it('extracts the module prefix used for grouping', () => {
    expect(permissionModule('orders.view')).toBe('orders');
    expect(permissionModule('drivers.verify')).toBe('drivers');
  });

  it('is tolerant of a code with no separator', () => {
    expect(permissionModule('audit')).toBe('audit');
  });
});

describe('permissionLabel', () => {
  it('humanizes dotted codes', () => {
    expect(permissionLabel('orders.force_status')).toBe('orders force status');
  });
});
