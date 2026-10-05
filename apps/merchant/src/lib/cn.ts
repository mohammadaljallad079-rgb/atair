export type ClassValue = string | number | null | false | undefined;

/** Tiny className joiner (avoids a dependency). */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
