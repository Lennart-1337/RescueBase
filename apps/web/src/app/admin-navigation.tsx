import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Archive,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Cog,
  HeartPulse,
  PackageCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { AuthenticatedUser } from "../lib/types";

type NavigationItem = {
  icon: typeof ClipboardList;
  label: string;
  search?: Record<string, never>;
  to:
    | "/"
    | "/admin/kits"
    | "/admin/inventory"
    | "/admin/purchase-orders"
    | "/admin/check-protocols"
    | "/admin/mpg"
    | "/admin/services"
    | "/admin/master-data/articles"
    | "/admin/user-management"
    | "/admin/settings"
    | "/admin/account";
};

export function useAdminNavigation(user: AuthenticatedUser) {
  const mpgPermission = useQuery({
    queryKey: ["mpg-permission", user.id],
    enabled: user.role !== "ADMIN",
    queryFn: async () => {
      const response = await fetch("/api/mpg-permissions/me", {
        credentials: "include",
      });
      if (!response.ok) return { medicalDevicesManage: false };
      return response.json() as Promise<{ medicalDevicesManage: boolean }>;
    },
  });
  const servicesPermission = useQuery({
    queryKey: ["service-permissions", "me", user.id],
    enabled: user.role !== "ADMIN",
    queryFn: async () => {
      const response = await fetch("/api/service-permissions/me", {
        credentials: "include",
      });
      if (!response.ok) return { servicesManage: false };
      return response.json() as Promise<{ servicesManage: boolean }>;
    },
  });
  const canManageServices =
    user.role === "ADMIN" || servicesPermission.data?.servicesManage === true;
  const canManageMpg =
    user.role === "ADMIN" || mpgPermission.data?.medicalDevicesManage === true;
  const navigationItems = [
    { icon: ClipboardList, label: "Aufträge", search: {}, to: "/" },
    ...(canManageServices
      ? [
          {
            icon: CalendarDays,
            label: "Dienste",
            to: "/admin/services" as const,
          },
        ]
      : []),
    { icon: PackageCheck, label: "Rucksäcke", search: {}, to: "/admin/kits" },
    { icon: Archive, label: "Lager", search: {}, to: "/admin/inventory" },
    {
      icon: ShoppingCart,
      label: "Bestellungen",
      search: {},
      to: "/admin/purchase-orders",
    },
    {
      icon: ClipboardCheck,
      label: "Check-Protokolle",
      search: {},
      to: "/admin/check-protocols",
    },
    ...(canManageMpg
      ? [
          {
            icon: HeartPulse,
            label: "MPG",
            search: {},
            to: "/admin/mpg" as const,
          },
        ]
      : []),
    ...(user.role === "ADMIN"
      ? [
          {
            icon: Settings,
            label: "Stammdaten",
            search: {},
            to: "/admin/master-data/articles" as const,
          },
        ]
      : []),
    ...(user.role === "ADMIN"
      ? [
          {
            icon: Users,
            label: "Benutzerverwaltung",
            to: "/admin/user-management" as const,
          },
        ]
      : []),
    ...(user.role === "ADMIN"
      ? [{ icon: Cog, label: "Einstellungen", to: "/admin/settings" as const }]
      : []),
    { icon: ShieldCheck, label: "Sicherheit", to: "/admin/account" },
  ] as const;
  return navigationItems;
}

export function NavigationList({
  items,
  onNavigate,
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
