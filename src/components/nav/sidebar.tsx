"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarRange, CalendarClock, HardHat, Building2, LogOut, Users, Factory, ShieldCheck } from "lucide-react";
import { signOut } from "@/app/(app)/actions";
import { DemoRoleSwitcher } from "@/components/nav/demo-role-switcher";
import { NotificationsDropdown } from "@/components/nav/notifications-dropdown";
import type { BookingChangeRequest, Profile } from "@/lib/data";

const NAV_ITEMS: {
  href: string;
  label: string;
  icon: typeof CalendarRange;
  adminOnly?: boolean;
  roles?: Profile["role"][];
}[] = [
  { href: "/schedule", label: "Capacity Schedule", icon: CalendarRange, roles: ["admin", "pm", "site_supervisor", "trade"] },
  { href: "/schedule/master", label: "Master Schedule", icon: CalendarClock, roles: ["trade"] },
  { href: "/trades", label: "Trades", icon: HardHat, roles: ["admin", "pm", "site_supervisor", "trade"] },
  { href: "/projects", label: "Projects", icon: Building2, roles: ["admin", "pm", "site_supervisor", "trade"] },
  { href: "/team", label: "Team", icon: Users, adminOnly: true },
  { href: "/precast", label: "Precast", icon: Factory, roles: ["admin", "precast"] },
  { href: "/safety", label: "Safety", icon: ShieldCheck, roles: ["admin", "safety"] },
];

const ROLE_LABELS: Record<Profile["role"], string> = {
  admin: "Admin",
  pm: "Project Manager",
  site_supervisor: "Site Supervisor",
  trade: "Trade Partner",
  precast: "Precast",
  safety: "Safety",
};

const ROLE_AVATAR_STYLES: Record<Profile["role"], string> = {
  admin: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
  pm: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  site_supervisor: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  trade: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  precast: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  safety: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
};

export function Sidebar({
  profile,
  demoMode = false,
  pendingChangeRequests = [],
}: {
  profile: Profile;
  demoMode?: boolean;
  pendingChangeRequests?: BookingChangeRequest[];
}) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      (item.href !== "/trades" || profile.role !== "trade") &&
      (!item.adminOnly || profile.role === "admin") &&
      (!item.roles || item.roles.includes(profile.role)),
  );
  // Longest matching href wins, so "/schedule/master" doesn't also light up "/schedule".
  const activeHref = visibleItems
    .map((item) => item.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
  const initials = profile.full_name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="shrink-0 border-b bg-card md:hidden">
        <div className="flex min-h-20 items-center gap-3 px-4 py-2">
          <div className="min-w-0 max-w-[210px] flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element -- static company brand asset */}
            <img
              src="/eagle-builders-logo.png"
              alt="Eagle Builders"
              className="h-auto w-full"
            />
            <p className="mt-0.5 text-center text-xs font-semibold text-muted-foreground">
              Trade Partner Program
            </p>
          </div>
          <span className="ml-auto text-xs text-muted-foreground">{ROLE_LABELS[profile.role]}</span>
          <NotificationsDropdown requests={pendingChangeRequests} profile={profile} />
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t p-2">
          {visibleItems.map((item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {demoMode && <DemoRoleSwitcher role={profile.role} />}
      </header>

      <aside className="hidden h-full w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex min-h-28 flex-col items-center justify-center border-b px-5 py-3">
        <div className="w-full max-w-[216px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static company brand asset */}
          <img
            src="/eagle-builders-logo.png"
            alt="Eagle Builders"
            className="h-auto w-full"
          />
          <p className="mt-1 text-center text-xs font-semibold text-muted-foreground">
            Trade Partner Program
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {visibleItems.map(
          (item) => {
            const active = item.href === activeHref;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          },
        )}
      </nav>

      <div className="border-t p-3">
        {demoMode && <DemoRoleSwitcher role={profile.role} />}
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className={ROLE_AVATAR_STYLES[profile.role]}>
              {initials || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {ROLE_LABELS[profile.role]}
            </p>
          </div>
          <NotificationsDropdown requests={pendingChangeRequests} profile={profile} />
        </div>
        <form action={signOut}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-start gap-2 text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </form>
      </div>
      </aside>
    </>
  );
}
