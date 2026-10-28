import { useState } from "react";
import { useCatalog, useServiceAction, useServices } from "./api";
import { QueryState } from "./query-state";
import { Overview } from "./overview";
import { Need } from "./need";
import { Personnel } from "./personnel";
import { Resources } from "./resources";
import { Preparation } from "./preparation";
import { Outcome } from "./outcome";
import { Finance } from "./finance";
import { StatusActions } from "./status-actions";
import { DeleteService } from "./delete-service";
import { DetailHeader } from "./detail-header";
import { DetailTabs } from "./detail-tabs";
import { OverviewEditDialog } from "./overview-edit-dialog";
import type { Service, ServiceWrite } from "./types";
import { serviceTabs, type ServiceTab } from "./navigation";
import "./detail.css";
export function ServiceDetail({
  id,
  tab,
  onTab,
  onBack,
}: {
  id: string;
  tab: ServiceTab;
  onTab: (tab: ServiceTab) => void;
  onBack: () => void;
}) {
  const query = useServices<Service>(`/${id}`);
  const catalog = useCatalog();
  const action = useServiceAction();
  const [editing, setEditing] = useState(false);
  if (!query.data) return <QueryState query={query} />;
  if (!catalog.data) return <QueryState query={catalog} />;
  const service = query.data;
  const locked = ["COMPLETED", "CANCELLED"].includes(service.status);
  const props = {
    service,
    catalog: catalog.data,
    locked,
    save: (body: Partial<ServiceWrite>) =>
      action.mutateAsync({
        path: `/${id}`,
        method: "PUT",
        body: { ...body, version: service.version },
      }),
  };
  return (
    <div className="service-detail">
      <DetailHeader
        service={service}
        locked={locked}
        onBack={onBack}
        onEdit={() => setEditing(true)}
      >
        <StatusActions
          key={`${id}-${service.version}`}
          service={service}
          catalog={catalog.data}
          onTransition={(status, reason) =>
            action.mutateAsync({
              path: `/${id}/transition`,
              body: { version: service.version, status, reason },
            })
          }
        />
        <DeleteService service={service} onDeleted={onBack} />
      </DetailHeader>
      <DetailTabs tab={tab} onTab={onTab} />
      <div
        role="tabpanel"
        id={`service-panel-${tab}`}
        aria-labelledby={`service-tab-${tab}`}
        aria-label={serviceTabs.find((item) => item.value === tab)?.label}
        key={`${id}-${service.version}-${tab}`}
      >
        {tab === "overview" ? (
          <Overview {...props} onTab={onTab} onEdit={() => setEditing(true)} />
        ) : tab === "need" ? (
          <Need {...props} />
        ) : tab === "personnel" ? (
          <Personnel {...props} />
        ) : tab === "resources" ? (
          <Resources {...props} />
        ) : tab === "preparation" ? (
          <Preparation {...props} />
        ) : tab === "outcome" ? (
          <Outcome {...props} />
        ) : (
          <Finance {...props} />
        )}
      </div>
      {editing && !locked ? (
        <OverviewEditDialog
          key={`${id}-${service.version}`}
          {...props}
          onClose={() => setEditing(false)}
        />
      ) : null}
    </div>
  );
}
