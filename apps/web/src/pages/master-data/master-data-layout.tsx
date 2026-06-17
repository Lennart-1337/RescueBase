import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { cn } from "../../components/ui";

const tabs = [
  { label: "Artikel", path: "/admin/master-data/articles" },
  { label: "Lagerorte", path: "/admin/master-data/locations" },
  { label: "Rucksackvorlagen", path: "/admin/master-data/templates" },
  { label: "Geräte", path: "/admin/master-data/devices" }
] as const;

export function MasterDataLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <>
      <header className="topbar">
        <div>
          <h1>Stammdaten</h1>
          <p>Artikel, Lagerorte und versionierte Rucksackvorlagen.</p>
        </div>
      </header>
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
      <Outlet />
    </>
  );
}
