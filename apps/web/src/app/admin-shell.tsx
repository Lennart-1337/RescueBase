import { NavigationList, useAdminNavigation } from "./admin-navigation";
import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "../components/ui";
import { fadeVariants, slideLeftVariants } from "../motion/presets";
import { AnimatedRouteView } from "../motion/animated-containers";
import { useMotionMode } from "../motion/use-motion-mode";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";
import { clearAccountQueries, setSignedOutSession } from "./auth-cache";
import { type AppBranding } from "./branding";
import { BrandMark } from "./brand-mark";
import { LegalLinks } from "./legal-links";
import { ThemeToggle } from "./theme";
import { APP_VERSION } from "./version";
import "./admin-shell.css";
import "./brand-mark.css";

export function AdminShell({ children, user, branding }: { children: ReactNode; user: AuthenticatedUser; branding: AppBranding }) {
  const queryClient = useQueryClient();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const motionMode = useMotionMode();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const navigationItems = useAdminNavigation(user);
  const routeKey = pathname.startsWith("/admin/master-data/") ? "/admin/master-data" : pathname;
  const logout = useMutation({
    mutationFn: rescueBaseApi.logout,
    onSuccess: async () => {
      await clearAccountQueries(queryClient);
      setSignedOutSession(queryClient);
    }
  });


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
        <div className="dashboard-content"><AnimatedRouteView routeKey={routeKey}>{children}</AnimatedRouteView></div>
        <div className="dashboard-footer">
          <div className="dashboard-footer-meta">
            <LegalLinks className="dashboard-legal" />
            <span aria-label="Version" className="dashboard-version">{APP_VERSION}</span>
          </div>
          <ThemeToggle className="dashboard-theme-toggle" />
        </div>
      </main>
    </div>
  );
}
