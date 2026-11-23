"use client";

import { useCallback, useEffect, useState } from "react";
import { getToken, setToken } from "./token";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(`Can't reach the StartupOS server. Make sure the backend is running at ${API_URL}.`);
  }

  // An expired or invalid session: log out so the app sends you to the login page.
  if (res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
    setToken(null);
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") message = body.detail;
      else if (Array.isArray(body?.detail) && body.detail[0]?.msg) {
        message = String(body.detail[0].msg).replace(/^Value error, /, "");
      }
    } catch {
      /* body wasn't JSON */
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}

/** Load a GET endpoint with loading / error state and a reload function. */
export function useApi<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(
    () =>
      api<T>(path)
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(errorMessage(e)))
        .finally(() => setLoading(false)),
    [path]
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const reload = useCallback(() => {
    setError(null);
    setLoading(true);
    return fetchData();
  }, [fetchData]);

  return { data, setData, error, loading, reload };
}
