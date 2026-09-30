import type { User } from '../types';
import { invalidateSession, jsonBody, request, settleRefresh } from './http/client';
import { invalidResponse, isRecord } from './http/errors';

// Transport shape stays here; components receive only User.
interface UserDto {
  id: string | number;
  email: string;
  role: 'user' | 'admin';
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  date_joined?: string;
  last_login?: string;
}

export type ProfileUpdate = Pick<Partial<User>, 'name' | 'phone' | 'address'>;

function optionalString(raw: Record<string, unknown>, key: string): string | undefined {
  const value = raw[key];
  if (value === undefined || value === null) return undefined;
  return typeof value === 'string' ? value : invalidResponse();
}

export function normalizeUser(value: unknown): User {
  if (!isRecord(value) || !['string', 'number'].includes(typeof value.id) || !String(value.id)
    || typeof value.email !== 'string' || (value.role !== 'user' && value.role !== 'admin')) return invalidResponse();
  const dto: UserDto = {
    id: typeof value.id === 'number' ? value.id : String(value.id), email: value.email, role: value.role,
    first_name: optionalString(value, 'first_name') ?? '', last_name: optionalString(value, 'last_name') ?? '',
    phone: optionalString(value, 'phone') ?? '', address: optionalString(value, 'address') ?? '',
    date_joined: optionalString(value, 'date_joined'), last_login: optionalString(value, 'last_login'),
  };
  const timestamp = (input?: string) => input && Number.isFinite(Date.parse(input)) ? Date.parse(input) : undefined;
  return {
    id: String(dto.id), email: dto.email, role: dto.role,
    name: optionalString(value, 'name') || [dto.first_name, dto.last_name].filter(Boolean).join(' ') || dto.email,
    phone: dto.phone || undefined, address: dto.address,
    createdAt: timestamp(dto.date_joined) ?? 0, lastLogin: timestamp(dto.last_login),
  };
}

// Serialize explicit session mutations and let any in-flight refresh finish before
// changing cookies. A late refresh cannot overwrite a newer login/logout cookie.
let mutation: Promise<unknown> = Promise.resolve();
function changeSession<T>(operation: () => Promise<T>): Promise<T> {
  invalidateSession();
  const result = mutation.catch(() => undefined).then(async () => {
    await settleRefresh();
    return operation();
  });
  mutation = result;
  return result;
}

async function authenticate(path: string, payload: unknown): Promise<{ user: User }> {
  const data = await request(path, { method: 'POST', ...jsonBody(payload) });
  return { user: normalizeUser(isRecord(data) && data.user !== undefined ? data.user : data) };
}

export const authApi = {
  login: (email: string, password: string, otp?: string) => changeSession(() =>
    authenticate('/api/auth/login/', { email, password, otp })),
  register: (name: string, email: string, password: string) => changeSession(() =>
    authenticate('/api/auth/register/', { first_name: name, email, password })),
  logout: () => changeSession(() => request('/api/auth/logout/', { method: 'POST' })),
  me: async (signal?: AbortSignal): Promise<User> => normalizeUser(await request('/api/auth/me/', { signal })),
  updateProfile: async (payload: ProfileUpdate): Promise<User> => normalizeUser(await request('/api/auth/me/update/', {
    method: 'PUT', ...jsonBody({ name: payload.name, phone: payload.phone, address: payload.address }),
  })),
};
