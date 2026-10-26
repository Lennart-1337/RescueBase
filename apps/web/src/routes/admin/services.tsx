import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AdminRoute } from "../../app/admin-route";
import { ServicesPage } from "../../pages/services/services-page";
import {
  serviceTabs,
  serviceViews,
  type ServiceTab,
  type ServiceView,
} from "../../pages/services/navigation";
export const Route = createFileRoute("/admin/services")({
  validateSearch: (search: Record<string, unknown>) => ({
    view: serviceViews.some((item) => item.value === search.view)
      ? (search.view as ServiceView)
      : ("list" as ServiceView),
    service:
      typeof search.service === "string" && search.service
        ? search.service
        : undefined,
    tab: serviceTabs.some((item) => item.value === search.tab)
      ? (search.tab as ServiceTab)
      : ("overview" as ServiceTab),
  }),
  component: ServicesRoute,
});
function ServicesRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/services" });
  return (
    <AdminRoute>
      {(user) =>
        user.role === "ADMIN" || user.servicesManage === true ? (
          <ServicesPage
            view={search.view}
            serviceId={search.service}
            tab={search.tab}
            onView={(view) =>
              void navigate({
                search: { view, service: undefined, tab: "overview" },
              })
            }
            onService={(service) =>
              void navigate({ search: { ...search, service, tab: "overview" } })
            }
            onTab={(tab) => void navigate({ search: { ...search, tab } })}
          />
        ) : (
          <section className="panel">
            <h1>Keine Berechtigung für die Dienstverwaltung</h1>
            <p>
              Für diesen Bereich ist die Berechtigung „Dienste verwalten“
              erforderlich.
            </p>
          </section>
        )
      }
    </AdminRoute>
  );
}
