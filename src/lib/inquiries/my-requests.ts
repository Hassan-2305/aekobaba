"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// "My requests" — the quote and sample requests this browser has sent,
// kept in localStorage (no account needed). Each entry carries the private
// access token the server issued, which /api/inquiries/lookup accepts to
// return that request's live status. The Quote Basket page lists them.

export interface MyRequest {
  id: string;
  token: string;
  reference: string;
  kind: "QUOTE" | "SAMPLE";
  productId: string;
  productTitle: string;
  supplierName: string;
  imageUrl: string | null;
  quantity: string;
  email: string;
  createdAt: string;
}

interface MyRequestsState {
  requests: MyRequest[];
  add: (request: MyRequest) => void;
  remove: (id: string) => void;
}

export const MY_REQUESTS_STORAGE_KEY = "aekobaba-my-requests";

function storageOrNoop(): Storage {
  try {
    const storage = globalThis.localStorage;
    if (storage) return storage;
  } catch {
    // SecurityError in some private modes — fall through.
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

export const useMyRequests = create<MyRequestsState>()(
  persist(
    (set) => ({
      requests: [],
      add: (request) =>
        set((state) => ({
          requests: [request, ...state.requests.filter((r) => r.id !== request.id)].slice(0, 50),
        })),
      remove: (id) => set((state) => ({ requests: state.requests.filter((r) => r.id !== id) })),
    }),
    {
      name: MY_REQUESTS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(storageOrNoop),
      // Server renders nothing; the browser restores after mount.
      skipHydration: true,
    },
  ),
);

/** True once the saved requests have been restored from localStorage. */
export function useMyRequestsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useMyRequests.persist.hasHydrated());
  useEffect(() => {
    if (!useMyRequests.persist.hasHydrated()) void useMyRequests.persist.rehydrate();
    setHydrated(useMyRequests.persist.hasHydrated());
    return useMyRequests.persist.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
