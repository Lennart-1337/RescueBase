import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "../../components/page-layout";
import { cn } from "../../components/ui";
import "./master-data-layout.css";

const tabs = [
  { label: "Artikel", path: "/admin/master-data/articles" },
  { label: "Lagerorte", path: "/admin/master-data/locations" },
  { label: "Rucksackvorlagen", path: "/admin/master-data/templates" },
  { label: "Geräte", path: "/admin/master-data/devices" }
] as const;

export function MasterDataLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="master-data-layout">
      <PageHeader title="Stammdaten" />
      <div aria-label="Stammdatenbereiche" className="tab-list" role="tablist">
        {tabs.map((tab) => (
          <Link
            aria-selected={pathname === tab.path}
            className={cn("tab-button", pathname === tab.path && "tab-button-active")}
            key={tab.path}
            role="tab"
            search={{}}
            to={tab.path}
          >
            {tab.label}
          </Link>
        ))}
      </div>
      <div className="master-data-content"><Outlet /></div>
    </div>
  );
}
