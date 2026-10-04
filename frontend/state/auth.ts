import { User } from '../types';
import api from '../services/api';
import { onSessionExpired } from '../services/http/client';
import { createStore } from './store';

export type AuthState = { status: 'loading' } | { status: 'anonymous' } | { status: 'customer' | 'admin'; user: User };
export function createAuth(onChange: (state: AuthState) => void) {
  const store = createStore<AuthState>({ status: 'loading' });
  let generation = 0;
  const apply = (state: AuthState) => { onChange(state); store.set(state); };
  const applyUser = (user: User) => apply({ status: user.role === 'admin' ? 'admin' : 'customer', user });
  const expire = () => { generation++; apply({ status: 'anonymous' }); };
  async function authenticate(operation: () => Promise<{ user: User }>) {
    // Transport invalidation happens synchronously when operation starts.
    const pending = operation();
    const attempt = ++generation;
    apply({ status: 'loading' });
    try {
      const result = await pending;
      if (attempt !== generation) return false;
      applyUser(result.user);
      return true;
    } catch (error) {
      if (attempt === generation) apply({ status: 'anonymous' });
      throw error;
    }
  }
  return {
    store,
    getVersion: () => generation,
    start() {
      const controller = new AbortController();
      const unsubscribe = onSessionExpired(expire);
      const attempt = ++generation;
      void api.me(controller.signal).then(user => {
        if (!controller.signal.aborted && attempt === generation) applyUser(user);
      }, () => { if (!controller.signal.aborted && attempt === generation) apply({ status: 'anonymous' }); });
      return () => { generation++; controller.abort(); unsubscribe(); };
    },
    login: (email: string, pass: string, code?: string) => authenticate(() => api.login(email, pass, code)),
    register: (name: string, email: string, pass: string) => authenticate(() => api.register(name, email, pass)),
    async logout() { expire(); await api.logout(); },
    async updateUserProfile(data: Partial<User>) {
      if (!('user' in store.getSnapshot())) return;
      const attempt = generation;
      const user = await api.updateProfile(data);
      if (attempt === generation) applyUser(user);
    },
  };
}
