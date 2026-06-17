import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Archive, ClipboardList, LogOut, PackageCheck, Settings, ShieldCheck, Users } from "lucide-react";
import { Button } from "../components/ui";
import { rescueBaseApi } from "../lib/api";
import type { AuthenticatedUser } from "../lib/types";

export function AdminShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const queryClient = useQueryClient();
  const logout = useMutation({
    mutationFn: rescueBaseApi.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">RB</div>
          <div>
            <strong>RescueBase</strong>
            <span>Sanitätslager</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Hauptnavigation">
          <Link search={{}} to="/" activeProps={{ className: "active" }} activeOptions={{ exact: true }}>
            <ClipboardList />
            Aufträge
          </Link>
          <Link search={{}} to="/admin/kits" activeProps={{ className: "active" }}>
            <PackageCheck />
            Rucksäcke
          </Link>
          <Link search={{}} to="/admin/inventory" activeProps={{ className: "active" }}>
            <Archive />
            Lager
          </Link>
          {user.role === "ADMIN" ? (
            <Link search={{ tab: "articles" }} to="/admin/master-data" activeProps={{ className: "active" }}>
              <Settings />
              Stammdaten
            </Link>
          ) : null}
          {user.role === "ADMIN" ? (
            <Link to="/admin/users" activeProps={{ className: "active" }}>
              <Users />
              Benutzer
            </Link>
          ) : null}
          <Link to="/admin/account" activeProps={{ className: "active" }}>
            <ShieldCheck />
            Sicherheit
          </Link>
        </nav>
        <div className="sidebar-user">
          <span>{user.displayName}</span>
          <small>{user.role === "ADMIN" ? "Admin" : "Lagerwart"}</small>
          <Button onClick={() => logout.mutate()} type="button" variant="ghost">
            <LogOut data-icon="inline-start" />
            Abmelden
          </Button>
        </div>
      </aside>
      <main className="dashboard">{children}</main>
    </div>
  );
}
