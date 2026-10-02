export function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return fallback;
}

export function toTimestamp(value: unknown, fallback = Date.now()): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function optionalTimestamp(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = toTimestamp(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseJsonList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string' && item.length > 0)
        : [value];
    } catch {
      return [value];
    }
  }
  return [];
}

export function parseStringRecord(value: unknown): Record<string, string> {
  let candidate = value;
  if (typeof candidate === 'string' && candidate.trim()) {
    try { candidate = JSON.parse(candidate); } catch { return {}; }
  }
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return {};
  return Object.fromEntries(
    Object.entries(candidate as Record<string, unknown>)
      .filter(([, item]) => item !== null && item !== undefined)
      .map(([key, item]) => [key, String(item)]),
  );
}
