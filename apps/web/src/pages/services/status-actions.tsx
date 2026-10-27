import { useState } from "react";
import { Button } from "../../components/ui";
import { StatusDialog } from "./status-dialog";
import { nextStatusAction } from "./status-action-config";
import type { Catalog, Service, ServiceStatus } from "./types";
export type StatusActionProps = {
  service: Service;
  catalog?: Catalog;
  onTransition: (status: ServiceStatus, reason: string) => Promise<unknown>;
};
export function StatusActions(props: StatusActionProps) {
  const [open, setOpen] = useState(false);
  const action = nextStatusAction(props.service.status);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{action.label}</Button>
      {open ? (
        <StatusDialog
          {...props}
          title={action.title}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
