import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Archive, ClipboardCheck, ClipboardList, Cog, LogOut, Menu, PackageCheck, Settings, ShieldCheck, Users, X } from "lucide-react";
import { Button } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import type { AppBranding } from "./branding";

export function AdminShell({ children, user, branding }: { children: ReactNode; user: AuthenticatedUser; branding: AppBranding }) {
  const queryClient = useQueryClient();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const logout = useMutation({
    mutationFn: rescueBaseApi.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });
  const navigationItems = [
    { icon: ClipboardList, label: "Aufträge", search: {}, to: "/" },
    { icon: PackageCheck, label: "Rucksäcke", search: {}, to: "/admin/kits" },
    { icon: Archive, label: "Lager", search: {}, to: "/admin/inventory" },
    { icon: ClipboardCheck, label: "Check-Protokolle", search: {}, to: "/admin/check-protocols" },
    ...(user.role === "ADMIN" ? [{ icon: Settings, label: "Stammdaten", search: {}, to: "/admin/master-data/articles" as const }] : []),
    ...(user.role === "ADMIN" ? [{ icon: Users, label: "Benutzer", to: "/admin/users" as const }] : []),
    ...(user.role === "ADMIN" ? [{ icon: Cog, label: "Einstellungen", to: "/admin/settings" as const }] : []),
    { icon: ShieldCheck, label: "Sicherheit", to: "/admin/account" }
  ] as const;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-main">
          <div className="sidebar-topbar">
            <div className="brand">
              <div className="brand-mark">RB</div>
              <div>
                <strong>{branding.appName}</strong>
                <span>{branding.appSubtitle}</span>
              </div>
            </div>
            <Button aria-expanded={isMobileNavOpen} aria-haspopup="dialog" aria-label="Menü öffnen" className="mobile-menu-button" onClick={() => setIsMobileNavOpen(true)} type="button" variant="ghost">
              <Menu />
            </Button>
          </div>
          <NavigationList items={navigationItems} />
        </div>
        <div className="sidebar-user">
          <span>{user.displayName}</span>
          <small>{user.role === "ADMIN" ? "Admin" : "Lagerwart"}</small>
          <Button onClick={() => logout.mutate()} type="button" variant="ghost">
            <LogOut data-icon="inline-start" />
            Abmelden
          </Button>
        </div>
      </aside>
      {isMobileNavOpen ? (
        <div className="mobile-drawer-backdrop" onClick={() => setIsMobileNavOpen(false)}>
          <div aria-label="Navigation" aria-modal="true" className="mobile-drawer" onClick={(event) => event.stopPropagation()} role="dialog">
            <div className="mobile-drawer-header">
              <div className="brand">
                <div className="brand-mark">RB</div>
                <div>
                  <strong>{branding.appName}</strong>
                  <span>{branding.appSubtitle}</span>
                </div>
              </div>
              <Button aria-label="Menü schließen" onClick={() => setIsMobileNavOpen(false)} type="button" variant="ghost">
                <X />
              </Button>
            </div>
            <NavigationList items={navigationItems} onNavigate={() => setIsMobileNavOpen(false)} />
            <div className="mobile-drawer-user">
              <span>{user.displayName}</span>
              <small>{user.role === "ADMIN" ? "Admin" : "Lagerwart"}</small>
              <Button onClick={() => logout.mutate()} type="button" variant="ghost">
                <LogOut data-icon="inline-start" />
                Abmelden
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      <main className="dashboard">{children}</main>
    </div>
  );
}

function NavigationList({
  items,
  onNavigate
}: {
  items: ReadonlyArray<{ icon: typeof ClipboardList; label: string; search?: {}; to: "/" | "/admin/kits" | "/admin/inventory" | "/admin/check-protocols" | "/admin/master-data/articles" | "/admin/users" | "/admin/settings" | "/admin/account" }>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="nav-list" aria-label="Hauptnavigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            activeOptions={{ exact: item.to === "/" }}
            activeProps={{ className: "active" }}
            key={item.to}
            onClick={onNavigate}
            search={item.search}
            to={item.to}
          >
            <Icon />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
