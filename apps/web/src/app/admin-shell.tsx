import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Archive, ClipboardCheck, ClipboardList, Cog, LogOut, Menu, PackageCheck, Settings, ShieldCheck, ShoppingCart, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../components/ui";
import { fadeVariants, slideLeftVariants } from "../motion/presets";
import { useMotionMode } from "../motion/use-motion-mode";
import { rescueBaseApi } from "../lib/api";
import { authKeys } from "../queries/auth";
import type { AuthenticatedUser } from "../lib/types";
import { type AppBranding } from "./branding";
import { BrandMark } from "./brand-mark";
import { LegalLinks } from "./legal-links";
import { ThemeToggle } from "./theme";
import "./admin-shell.css";
import "./brand-mark.css";

type NavigationItem = {
  icon: typeof ClipboardList;
  label: string;
  search?: Record<string, never>;
  to: "/" | "/admin/kits" | "/admin/inventory" | "/admin/purchase-orders" | "/admin/check-protocols" | "/admin/master-data/articles" | "/admin/users" | "/admin/settings" | "/admin/account";
};

export function AdminShell({ children, user, branding }: { children: ReactNode; user: AuthenticatedUser; branding: AppBranding }) {
  const queryClient = useQueryClient();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const motionMode = useMotionMode();
  const logout = useMutation({
    mutationFn: rescueBaseApi.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.session() });
    }
  });
  const navigationItems = [
    { icon: ClipboardList, label: "Aufträge", search: {}, to: "/" },
    { icon: PackageCheck, label: "Rucksäcke", search: {}, to: "/admin/kits" },
    { icon: Archive, label: "Lager", search: {}, to: "/admin/inventory" },
    { icon: ShoppingCart, label: "Bestellungen", search: {}, to: "/admin/purchase-orders" },
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
              {branding.showLogo ? <div className="brand-mark"><BrandMark /></div> : null}
              {branding.showAppName ? <strong>{branding.appName}</strong> : null}
              {branding.showAppSubtitle ? <span>{branding.appSubtitle}</span> : null}
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
          <Button loading={logout.isPending} onClick={() => logout.mutate()} type="button" variant="ghost">
            <LogOut data-icon="inline-start" />
            Abmelden
          </Button>
        </div>
      </aside>
      <AnimatePresence initial={false}>
        {isMobileNavOpen ? (
          <motion.div
            animate="visible"
            className="mobile-drawer-backdrop"
            data-motion-mode={motionMode}
            data-motion-preset="fade"
            exit="exit"
            initial="hidden"
            onClick={() => setIsMobileNavOpen(false)}
            variants={fadeVariants(motionMode)}
          >
            <motion.div
              animate="visible"
              aria-label="Navigation"
              aria-modal="true"
              className="mobile-drawer"
              data-motion-mode={motionMode}
              data-motion-preset="slide-left"
              exit="exit"
              initial="hidden"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              variants={slideLeftVariants(motionMode)}
            >
              <div className="mobile-drawer-header">
                <div className="brand">
                  {branding.showLogo ? <div className="brand-mark"><BrandMark /></div> : null}
                  {branding.showAppName ? <strong>{branding.appName}</strong> : null}
                  {branding.showAppSubtitle ? <span>{branding.appSubtitle}</span> : null}
                </div>
                <Button aria-label="Menü schließen" onClick={() => setIsMobileNavOpen(false)} type="button" variant="ghost">
                  <X />
                </Button>
              </div>
              <NavigationList items={navigationItems} onNavigate={() => setIsMobileNavOpen(false)} />
              <div className="mobile-drawer-user">
                <span>{user.displayName}</span>
                <small>{user.role === "ADMIN" ? "Admin" : "Lagerwart"}</small>
                <Button loading={logout.isPending} onClick={() => logout.mutate()} type="button" variant="ghost">
                  <LogOut data-icon="inline-start" />
                  Abmelden
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <main className="dashboard">
        <div className="dashboard-content">{children}</div>
        <div className="dashboard-footer">
          <LegalLinks className="dashboard-legal" />
          <ThemeToggle className="dashboard-theme-toggle" />
        </div>
      </main>
    </div>
  );
}

function NavigationList({
  items,
  onNavigate
}: {
  items: ReadonlyArray<NavigationItem>;
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
