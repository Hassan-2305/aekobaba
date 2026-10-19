"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ProductVM } from "@/lib/catalog/view-models";

// Compare selection — up to four products, side by side (v12 design). Like
// the Quote Basket it is anonymous and lives in localStorage; comparing never
// adds anything to the basket. Each entry snapshots the ProductVM the visitor
// saw, so the table renders exactly what they picked.

export const COMPARE_MAX = 4;
export const COMPARE_STORAGE_KEY = "aekobaba-compare";

interface CompareState {
  items: ProductVM[];
  /** Whether the side-by-side table is expanded in the tray. */
  open: boolean;
  toggle: (product: ProductVM) => void;
  remove: (productId: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
}

function storage(): Storage {
  try {
    if (globalThis.localStorage) return globalThis.localStorage;
  } catch {
    // Blocked storage: fall through to a no-op.
  }
  return {
    get length() {
      return 0;
    },
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
  } satisfies Storage;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set) => ({
      items: [],
      open: false,
      toggle: (product) =>
        set((state) => {
          if (state.items.some((p) => p.id === product.id)) {
            return { items: state.items.filter((p) => p.id !== product.id) };
          }
          if (state.items.length >= COMPARE_MAX) return state;
          return { items: [...state.items, product] };
        }),
      remove: (productId) => set((state) => ({ items: state.items.filter((p) => p.id !== productId) })),
      clear: () => set({ items: [], open: false }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: COMPARE_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(storage),
      partialize: (state) => ({ items: state.items }),
      skipHydration: true,
    },
  ),
);

/** True once the saved selection is restored (server renders an empty one). */
export function useCompareHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useCompareStore.persist.hasHydrated());
  useEffect(() => {
    if (!useCompareStore.persist.hasHydrated()) void useCompareStore.persist.rehydrate();
    setHydrated(useCompareStore.persist.hasHydrated());
    return useCompareStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
