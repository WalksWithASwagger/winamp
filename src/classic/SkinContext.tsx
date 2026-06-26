"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { Skin } from "./skinParser";

const SkinContext = createContext<Skin | null>(null);

export function SkinProvider({
  skin,
  children,
}: {
  skin: Skin | null;
  children: ReactNode;
}) {
  return <SkinContext.Provider value={skin}>{children}</SkinContext.Provider>;
}

/** The active parsed skin, or null while loading / on error. */
export function useSkinContext(): Skin | null {
  return useContext(SkinContext);
}
