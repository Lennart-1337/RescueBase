import { PageHeader } from "../../components/page-layout";
import { Field, Tabs } from "../../components/ui";
import { ServiceList } from "./service-list";
import { ServiceDetail } from "./service-detail";
import { serviceViews, type ServiceView, type ServiceTab } from "./navigation";
import { CatalogPage, type CatalogView } from "./catalog-page";
import { Statistics } from "./statistics";
import "./services.css";
import "./workspace.css";

const mainViews = [
  { value: "list", label: "Dienste" },
  { value: "statistics", label: "Statistik" },
  { value: "master", label: "Stammdaten" },
];
export function ServicesPage({
  view,
  serviceId,
  tab,
  onView,
  onService,
  onTab,
}: {
  view: ServiceView;
  serviceId?: string;
  tab: ServiceTab;
  onView: (view: ServiceView) => void;
  onService: (id?: string) => void;
  onTab: (tab: ServiceTab) => void;
}) {
  if (serviceId)
    return (
      <div className="services-page">
        <ServiceDetail
          id={serviceId}
          tab={tab}
          onTab={onTab}
          onBack={() => onService()}
        />
      </div>
    );
  const isCatalog = view !== "list" && view !== "statistics";
  return (
    <div className="services-page">
      <PageHeader title="Dienste" />
      <Tabs
        label="Dienstverwaltung"
        items={mainViews}
        value={isCatalog ? "master" : view}
        onChange={(value) =>
          onView(value === "master" ? "people" : (value as ServiceView))
        }
      />
      {isCatalog ? (
        <Field label="Stammdatenbereich" className="service-catalog-switch">
          <select
            aria-label="Stammdatenbereich"
            value={view}
            onChange={(event) => onView(event.target.value as ServiceView)}
          >
            {serviceViews
              .filter(
                (item) => item.value !== "list" && item.value !== "statistics",
              )
              .map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
          </select>
        </Field>
      ) : null}
      {view === "list" ? (
        <ServiceList onSelect={onService} />
      ) : view === "statistics" ? (
        <Statistics onSelect={onService} />
      ) : (
        <CatalogPage view={view as CatalogView} />
      )}
    </div>
  );
}
