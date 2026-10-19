"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// The shop chrome (header, footer, compare tray) stays out of the admin
// console — the team works in a dashboard with its own top bar.

export function ChromeGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname?.startsWith("/admin/")) return null;
  return <>{children}</>;
}
