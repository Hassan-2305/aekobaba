import type { UserRole } from "./roles";

// Where each role's account menu points (shared by the server header and the
// client menu).

export function accountLinks(role: UserRole | null): { label: string; href: string }[] {
  if (role === "ADMIN")
    return [
      { label: "Dashboard", href: "/admin" },
      { label: "Quote requests", href: "/admin/quotes" },
      { label: "Supplier applications", href: "/admin/applications" },
    ];
  if (role === "SUPPLIER") return [{ label: "Supplier workspace", href: "/supplier" }];
  return [
    { label: "My quote requests", href: "/account/requests" },
    { label: "Quote Basket", href: "/basket" },
  ];
}
