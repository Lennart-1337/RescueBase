import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { Button, Dialog } from "../../components/ui";
import { serviceRequest } from "./api";
import type { Service } from "./types";

export function DeleteService({ service, onDeleted }: {
  service: Service;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const client = useQueryClient();
  const path = `/${service.id}`;
  const deletion = useMutation({
    mutationFn: () => serviceRequest<{ id: string }>(path, { version: service.version }, "DELETE"),
    onSuccess: async () => {
      client.removeQueries({ queryKey: ["services", path], exact: true });
      onDeleted();
      await client.invalidateQueries({ queryKey: ["services"],
        predicate: (query) => query.queryKey[1] !== path });
    },
  });
  const close = () => { if (!deletion.isPending) setOpen(false); };
  return (
    <>
      <Button variant="ghost" aria-label="Dienst löschen" title="Dienst löschen"
        onClick={() => { deletion.reset(); setOpen(true); }}>
        <Trash2 aria-hidden="true" size={18} />
      </Button>
      <Dialog title="Dienst löschen?" open={open} onClose={close}>
        <div className="service-status-dialog">
          <p><strong>{service.title}</strong> wird aus der Dienstplanung entfernt.
            Die Daten bleiben gespeichert; Reservierungen werden freigegeben.</p>
          {deletion.error ? <p role="alert" className="service-error">{deletion.error.message}</p> : null}
          <div className="service-dialog-actions">
            <Button variant="secondary" disabled={deletion.isPending} onClick={close}>Abbrechen</Button>
            <Button variant="danger" aria-label="Löschen bestätigen" loading={deletion.isPending}
              onClick={() => deletion.mutate()}>Dienst löschen</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
