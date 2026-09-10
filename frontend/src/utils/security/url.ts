const SAFE_PROTOCOLS = ['http:', 'https:'] as const;

export function isSafeUrl(value: string): boolean {
  if (!value || !value.trim()) return false;
  try {
    const url = new URL(value, window.location.origin);
    if (!SAFE_PROTOCOLS.includes(url.protocol as (typeof SAFE_PROTOCOLS)[number])) return false;
    if (value.startsWith('//')) return false;
    return true;
  } catch {
    return false;
  }
}

export function sanitizeUrl(value: string): string | undefined {
  return isSafeUrl(value) ? value : undefined;
}
