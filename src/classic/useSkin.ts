"use client";

import { useEffect, useState } from "react";
import { parseSkin, type Skin } from "./skinParser";

export type SkinStatus = "loading" | "ready" | "error";

export type UseSkinResult = {
  skin: Skin | null;
  status: SkinStatus;
  error: Error | null;
};

// Parsed skins are cached by URL so switching back to a skin is instant and
// concurrent consumers share one fetch. Failures are not cached.
const cache = new Map<string, Promise<Skin>>();

function load(url: string): Promise<Skin> {
  let pending = cache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`skin fetch failed: ${r.status}`);
        return r.arrayBuffer();
      })
      .then(parseSkin);
    pending.catch(() => cache.delete(url));
    cache.set(url, pending);
  }
  return pending;
}

/**
 * Load and parse a `.wsz` skin by URL. Never throws into the render tree —
 * parse/fetch failures surface as `status: "error"` so the caller can fall back
 * to a base skin. Re-runs when `url` changes (runtime skin switching).
 */
export function useSkin(url: string | null | undefined): UseSkinResult {
  const [state, setState] = useState<UseSkinResult>({
    skin: null,
    status: url ? "loading" : "ready",
    error: null,
  });

  useEffect(() => {
    if (!url) {
      setState({ skin: null, status: "ready", error: null });
      return;
    }
    let alive = true;
    setState((s) => ({ ...s, status: "loading", error: null }));
    load(url)
      .then((skin) => {
        if (alive) setState({ skin, status: "ready", error: null });
      })
      .catch((error: Error) => {
        if (alive) setState({ skin: null, status: "error", error });
      });
    return () => {
      alive = false;
    };
  }, [url]);

  return state;
}
