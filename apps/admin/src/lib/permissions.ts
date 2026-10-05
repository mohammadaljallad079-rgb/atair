/** Client mirror of packages/db permission helpers. Codes come from the API
 *  at runtime; this only derives the module prefix for grouping in the UI. */
export function permissionModule(code: string): string {
  return code.split('.')[0] ?? code;
}

export function permissionLabel(code: string): string {
  return code.replace(/[._]/g, ' ');
}
