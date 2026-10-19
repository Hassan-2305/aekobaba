import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { getServerSessionUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { MAX_ATTEMPTS } from "@/lib/notify/outbox";

import { AdminSearch, AdminUserMenu, MobileNavButton } from "./admin-chrome";
import { AdminIcon, type AdminIconName } from "./icons";

// The admin console frame: dark sidebar (sections with live counts, account
// menu), a top bar with search and notifications, and a warm work surface.
// Every admin page renders inside it (WorkspaceShell delegates here).

export type AdminSection =
  | "dashboard"
  | "quotes"
  | "applications"
  | "notifications"
  | "inquiries"
  | "suppliers"
  | "categories";

interface NavItem {
  id: AdminSection;
  href: string;
  label: string;
  icon: AdminIconName;
  count?: number;
}

async function counts() {
  try {
    const [newRequests, pendingApps, undelivered, newInquiries] = await Promise.all([
      db.quoteRequest.count({ where: { stage: "NEW" } }),
      db.supplierApplication.count({ where: { status: "PENDING" } }),
      db.notificationOutbox.count({ where: { status: { in: ["PENDING", "FAILED", "SENDING"] }, attempts: { lt: MAX_ATTEMPTS } } }),
      db.inquiry.count({ where: { status: "NEW" } }),
    ]);
    return { newRequests, pendingApps, undelivered, newInquiries };
  } catch {
    return { newRequests: 0, pendingApps: 0, undelivered: 0, newInquiries: 0 };
  }
}

async function currentAdmin(): Promise<{ name: string; email: string }> {
  const session = await getServerSessionUser().catch(() => null);
  const user = session
    ? await db.user.findUnique({ where: { supabaseUserId: session.supabaseUserId }, select: { name: true, email: true } }).catch(() => null)
    : null;
  const email = user?.email ?? session?.email ?? "";
  return { name: user?.name || "Team Aekovera", email };
}

function Sidebar({ items, active, admin }: { items: NavItem[]; active?: AdminSection; admin: { name: string; email: string } }) {
  return (
    <div className="flex h-full flex-col bg-[#131417] px-4 pb-4 pt-6 text-white">
      <Link href="/admin" className="flex items-center gap-3 px-2">
        <Image src="/brand/logo-white.png" alt="Aekobaba" width={132} height={28} className="h-7 w-auto" />
        <span className="rounded-md border border-white/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/70">Admin</span>
      </Link>
      <nav aria-label="Admin sections" className="mt-9 flex flex-col gap-1">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group flex h-12 items-center gap-3.5 rounded-xl px-3.5 text-[15px] transition-colors ${
                isActive
                  ? "bg-[linear-gradient(100deg,#7a2f0b_0%,#3a1a0b_70%,#2a170c_100%)] text-white shadow-[inset_0_0_0_1px_rgba(247,104,8,.35)]"
                  : "text-white/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              <AdminIcon name={item.icon} size={20} className={isActive ? "text-orange" : "text-white/70 group-hover:text-white"} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.count ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange px-1.5 text-[11px] font-semibold text-white">
                  {item.count > 99 ? "99+" : item.count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="my-6 border-t border-white/10" />
      <Link href="/results" className="flex h-12 items-center gap-3.5 rounded-xl px-3.5 text-[15px] text-white/75 hover:bg-white/5 hover:text-white">
        <AdminIcon name="store" size={20} className="text-white/70" />
        <span className="flex-1">View marketplace</span>
        <AdminIcon name="external" size={16} className="text-white/50" />
      </Link>
      <div className="mt-auto border-t border-white/10 pt-4">
        <AdminUserMenu name={admin.name} email={admin.email} />
      </div>
    </div>
  );
}

export async function AdminShell({
  active,
  eyebrow,
  title,
  subtitle,
  actions,
  hideHeader = false,
  searchQuery,
  children,
}: {
  active?: AdminSection;
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** The page draws its own header (the dashboard's welcome band). */
  hideHeader?: boolean;
  searchQuery?: string;
  children: ReactNode;
}) {
  const [c, admin] = await Promise.all([counts(), currentAdmin()]);
  const items: NavItem[] = [
    { id: "dashboard", href: "/admin", label: "Dashboard", icon: "home" },
    { id: "quotes", href: "/admin/quotes", label: "Quote requests", icon: "quote", count: c.newRequests },
    { id: "applications", href: "/admin/applications", label: "Supplier applications", icon: "user", count: c.pendingApps },
    { id: "notifications", href: "/admin/notifications", label: "Email outbox", icon: "mail", count: c.undelivered },
    { id: "inquiries", href: "/admin/inquiries", label: "Product requests", icon: "box", count: c.newInquiries },
    { id: "suppliers", href: "/admin/suppliers", label: "Supplier verification", icon: "shield" },
    { id: "categories", href: "/admin/categories", label: "Categories", icon: "grid" },
  ];
  const alerts = c.newRequests + c.newInquiries + c.pendingApps;

  return (
    <div className="min-h-screen bg-[#f6f4f1] lg:pl-[268px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[268px] lg:block">
        <Sidebar items={items} active={active} admin={admin} />
      </aside>

      <header className="sticky top-0 z-20 flex h-[76px] items-center gap-3 border-b border-[#ebe7e1] bg-[#f6f4f1]/90 px-4 backdrop-blur sm:px-8">
        <MobileNavButton>
          <Sidebar items={items} active={active} admin={admin} />
        </MobileNavButton>
        <AdminSearch initial={searchQuery} />
        <Link
          href="/admin#attention"
          aria-label={alerts ? `${alerts} items need attention` : "Nothing needs attention"}
          title={alerts ? `${alerts} new items need attention` : "All caught up"}
          className="relative ml-auto flex h-11 w-11 flex-none items-center justify-center rounded-lg text-ink hover:bg-white"
        >
          <AdminIcon name="bell" size={22} />
          {alerts ? <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[#f6f4f1] bg-orange" /> : null}
        </Link>
      </header>

      <main className="px-4 pb-16 pt-8 sm:px-8">
        {hideHeader ? null : (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              {eyebrow ? <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">{eyebrow}</p> : null}
              <h1 className="mt-1.5 font-serif text-[34px] leading-[1.1] tracking-[-0.01em] text-ink sm:text-[40px]">{title}</h1>
              {subtitle ? <div className="mt-2 text-[15px] text-ink-muted">{subtitle}</div> : null}
            </div>
            {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

/** White card used across the console. */
export function AdminCard({
  title,
  action,
  children,
  className = "",
  id,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 rounded-2xl border border-[#ebe7e1] bg-white p-5 shadow-[0_1px_2px_rgba(24,26,33,.04)] sm:p-6 ${className}`}>
      {title || action ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
