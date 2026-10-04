// Compatibility for integration probes. Application consumers use focused hooks.
import { useActions, useAuth, useCart, useCatalog, useOverlays, useSettings, useTheme, useToast, useWishlist } from '../state/AppState';
export { AppStateProvider as GlobalProvider } from '../state/AppState';
export { cartLineKey } from '../state/persistence';
export type { AuthState } from '../state/auth';
export function useGlobal() {
  return { ...useActions(), ...useAuth(), ...useCart(), ...useWishlist(), ...useCatalog(), ...useSettings(), ...useOverlays(), ...useTheme(), ...useToast() };
}
