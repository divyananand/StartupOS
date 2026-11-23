"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { api, errorMessage } from "./api";
import { getToken, setToken, subscribeToken } from "./token";

export interface User {
  id: number;
  name: string;
  email: string;
}

type AuthStatus = "loading" | "authed" | "anon" | "error";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const noopSubscribe = () => () => {};

export function AuthProvider({ children }: { children: ReactNode }) {
  // Server render and first client render both see "no token yet"; the real
  // value arrives right after hydration, so nothing redirects too early.
  const token = useSyncExternalStore(subscribeToken, getToken, () => null);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const [session, setSession] = useState<{ token: string; user: User } | null>(null);
  const [failure, setFailure] = useState<{ token: string; message: string } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<User>("/auth/me")
      .then((user) => {
        if (!cancelled) setSession({ token, user });
      })
      .catch((e) => {
        // A 401 already cleared the token; anything else is e.g. the server being down.
        if (!cancelled && getToken() === token) setFailure({ token, message: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [token, attempt]);

  const user = session && session.token === token ? session.user : null;
  const error = failure && failure.token === token && !user ? failure.message : null;
  const status: AuthStatus = !hydrated ? "loading" : !token ? "anon" : user ? "authed" : error ? "error" : "loading";

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setSession({ token: res.token, user: res.user });
    setToken(res.token);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    setSession({ token: res.token, user: res.user });
    setToken(res.token);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    setToken(null);
  }, []);

  const retry = useCallback(() => {
    setFailure(null);
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ status, user, error, login, register, logout, retry }),
    [status, user, error, login, register, logout, retry]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
