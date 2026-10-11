"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, Building2, Users, Library } from "lucide-react";
import { cn } from "@/lib/utils";

const MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/clients", label: "Clients", icon: Building2 },
  { href: "/catalog", label: "Pulse catalog", icon: Library },
];

const ADMIN = [{ href: "/admin/users", label: "Users and roles", icon: Users }];

export function Nav({ isAdmin, horizontal }: { isAdmin: boolean; horizontal?: boolean }) {
  const pathname = usePathname();
  const item = ({ href, label, icon: Icon }: (typeof MAIN)[number]) => {
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <Link
        key={href}
        href={href}
        className={cn(
          "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
          active ? "bg-brand-600 text-white shadow-sm shadow-brand-600/25" : "text-muted hover:bg-brand-50 hover:text-brand-700",
        )}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    );
  };

  if (horizontal) {
    return (
      <nav className="flex gap-1 overflow-x-auto">
        {MAIN.map(item)}
        {isAdmin && ADMIN.map(item)}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1">
      {MAIN.map(item)}
      {isAdmin && (
        <>
          <p className="mt-6 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Admin</p>
          {ADMIN.map(item)}
        </>
      )}
    </nav>
  );
}
