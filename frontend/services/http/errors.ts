export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields: Record<string, string[]> = {},
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function apiError(status: number, body: unknown): ApiError {
  // HTML/proxy errors and internal server details are never user-facing.
  const fallback = status >= 500 ? 'The service is temporarily unavailable.'
    : status === 401 ? 'Your session has expired. Please sign in again.'
    : status === 403 ? 'This request is not permitted.' : 'The request could not be completed.';
  const code = isRecord(body) && typeof body.code === 'string' && /^[a-zA-Z0-9_.-]{1,100}$/.test(body.code)
    ? body.code : undefined;
  if (!isRecord(body) || status >= 500) return new ApiError(status, fallback, {}, code);
  const fields: Record<string, string[]> = {};
  const collect = (value: unknown, path: string) => {
    if (typeof value === 'string') fields[path || 'non_field_errors'] = [value];
    else if (Array.isArray(value)) {
      if (value.every(item => typeof item === 'string')) fields[path || 'non_field_errors'] = value;
      else value.forEach((item, index) => collect(item, path ? `${path}.${index}` : String(index)));
    } else if (isRecord(value)) {
      Object.entries(value).forEach(([key, item]) => collect(item, path ? `${path}.${key}` : key));
    }
  };
  if (isRecord(body.errors) || Array.isArray(body.errors)) collect(body.errors, '');
  else Object.entries(body).filter(([key]) => !['detail', 'message', 'code'].includes(key))
    .forEach(([key, value]) => collect(value, key));
  const message = typeof body.detail === 'string' ? body.detail
    : typeof body.message === 'string' ? body.message : Object.values(fields)[0]?.[0] || fallback;
  return new ApiError(status, message, fields, code);
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

export function invalidResponse(): never {
  throw new ApiError(502, 'The service returned an invalid response.', {}, 'invalid_response');
}
