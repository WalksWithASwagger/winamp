"use client";

import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDragControls, useMotionValue } from "framer-motion";
import { usePrefersReducedMotion } from "../usePrefersReducedMotion";

type PersistPatch = Record<string, unknown>;

export function useDeckWindowState({
  storageKey,
  setEqGains,
}: {
  storageKey: string;
  setEqGains: (gains: number[]) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const [shaded, setShaded] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [eqPreset, setEqPreset] = useState<string | null>(null);
  const [canViz, setCanViz] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dragControls = useDragControls();
  const boundsRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const persist = useCallback(
    (patch: PersistPatch) => {
      try {
        const cur = JSON.parse(localStorage.getItem(storageKey) || "{}");
        localStorage.setItem(storageKey, JSON.stringify({ ...cur, ...patch }));
      } catch {
        /* private mode / no storage — non-fatal */
      }
    },
    [storageKey],
  );

  useEffect(() => {
    const restore = () => {
      try {
        const s = JSON.parse(localStorage.getItem(storageKey) || "{}");
        if (typeof s.x === "number") x.set(s.x);
        if (typeof s.y === "number") y.set(s.y);
        if (typeof s.doubled === "boolean") setDoubled(s.doubled);
        if (Array.isArray(s.eq)) setEqGains(s.eq);
        if (typeof s.eqPreset === "string") setEqPreset(s.eqPreset);
      } catch {
        /* ignore */
      }
    };
    const check = () => {
      const mobile = window.innerWidth < 640;
      setIsMobile(mobile);
      let gl2 = false;
      try {
        gl2 = !!document.createElement("canvas").getContext("webgl2");
      } catch {
        gl2 = false;
      }
      setCanViz(!mobile && window.innerWidth >= 760 && gl2 && !reduced);
    };
    const clampIntoView = () => {
      const el = deckRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const m = 6;
      let dx = 0;
      let dy = 0;
      if (r.right > window.innerWidth - m) dx = window.innerWidth - m - r.right;
      else if (r.left < m) dx = m - r.left;
      if (r.bottom > window.innerHeight - m) dy = window.innerHeight - m - r.bottom;
      else if (r.top < m) dy = m - r.top;
      if (dx) x.set(x.get() + dx);
      if (dy) y.set(y.get() + dy);
    };
    restore();
    check();
    requestAnimationFrame(clampIntoView);
    const onResize = () => {
      check();
      requestAnimationFrame(clampIntoView);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [x, y, reduced, storageKey, setEqGains]);

  const startDrag = useCallback(
    (e: ReactPointerEvent) => {
      if (isMobile) return;
      if ((e.target as HTMLElement).closest("button")) return;
      dragControls.start(e);
    },
    [dragControls, isMobile],
  );

  const onBarDoubleClick = useCallback((e: ReactMouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setShaded((v) => !v);
  }, []);

  const toggleDoubleSize = useCallback(() => {
    setDoubled((v) => {
      persist({ doubled: !v });
      return !v;
    });
  }, [persist]);

  return {
    canViz,
    deckRef,
    doubled,
    dragControls,
    isMobile,
    onBarDoubleClick,
    persist,
    shaded,
    setShaded,
    startDrag,
    toggleDoubleSize,
    boundsRef,
    x,
    y,
    reduced,
    eqPreset,
    setEqPreset,
  };
}
