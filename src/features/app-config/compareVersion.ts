/** True when `current` is strictly below `min` (numeric x.y.z). Empty min = no force. */
export function isVersionBelow(current: string, min: string | null | undefined): boolean {
  if (!min || !min.trim()) return false;
  const parse = (value: string) =>
    value
      .split('.')
      .map((part) => {
        const n = Number.parseInt(part, 10);
        return Number.isFinite(n) ? n : 0;
      });
  const a = parse(current);
  const b = parse(min);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return true;
    if (av > bv) return false;
  }
  return false;
}
