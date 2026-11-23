// The login token lives in localStorage so it survives reloads. This tiny
// store lets React (via useSyncExternalStore) and the API client share it,
// and keeps other open tabs in sync when you log in or out.

const KEY = "startupos_token";
const listeners = new Set<() => void>();

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable (private mode) */
  }
  listeners.forEach((l) => l());
}

export function subscribeToken(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
