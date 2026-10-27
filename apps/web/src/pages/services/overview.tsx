import { useState } from "react";
import type { ServiceEditorProps } from "./editor";
import type { ServiceTab } from "./navigation";
import { OverviewDetails } from "./overview-details";
import { OverviewPlanning } from "./overview-planning";
import { OverviewDisclosures } from "./overview-disclosures";
import { OverviewTasks } from "./overview-tasks";
import { OverviewEditDialog } from "./overview-edit-dialog";
export function Overview(
  props: ServiceEditorProps & {
    onTab: (tab: ServiceTab) => void;
    onEdit?: () => void;
  },
) {
  const [editing, setEditing] = useState(false);
  const edit = props.onEdit ?? (() => setEditing(true));
  return (
    <div className="service-overview">
      <div className="service-overview-columns">
        <OverviewDetails
          service={props.service}
          catalog={props.catalog}
          locked={props.locked}
          onEdit={edit}
        />
        <OverviewPlanning service={props.service} onTab={props.onTab} />
      </div>
      <OverviewDisclosures service={props.service} catalog={props.catalog} />
      <OverviewTasks
        service={props.service}
        save={props.save}
        locked={props.locked}
        onOpen={() => props.onTab("preparation")}
      />
      {editing && !props.locked ? (
        <OverviewEditDialog {...props} onClose={() => setEditing(false)} />
      ) : null}
    </div>
  );
}
