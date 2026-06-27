"use client";

import { useEffect, useState } from "react";

/** useState backed by localStorage under `key` (no persistence if key is null). */
export function usePersistedState<T>(key: string | null, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined" || !key) return initial;
    try {
      const stored = window.localStorage.getItem(key);
      return stored == null ? initial : (JSON.parse(stored) as T);
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined" || !key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [key, value]);

  return [value, setValue] as const;
}
