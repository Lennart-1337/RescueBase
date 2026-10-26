import { useState } from "react";
import { Button } from "../../components/ui";
import { ServiceCollection } from "./collection";
import { datetime, text } from "./form";
import type { ServiceEditorProps } from "./editor";
import { displayTime } from "./time";
import {
  PreparationDialogs,
  type PreparationDialog,
} from "./preparation-dialogs";
import type { ServiceTask } from "./types";
import "./service-tools.css";
export function Preparation(props: ServiceEditorProps) {
  const { service, catalog, save, locked } = props;
  const [dialog, setDialog] = useState<PreparationDialog>(null);
  return (
    <div className="service-stack">
      <ServiceCollection<ServiceTask>
        title="Aufgaben"
        createLabel="Aufgabe hinzufügen"
        rows={service.tasks}
        fields={[
          text("title", "Aufgabe", true),
          {
            name: "responsibleId",
            label: "Verantwortlich",
            options: catalog.users.map((user) => ({
              value: user.id,
              label: user.displayName,
            })),
          },
          datetime("dueAt", "Fällig am"),
          { name: "done", label: "Erledigt", type: "checkbox" },
        ]}
        defaults={{ done: false }}
        locked={locked}
        headerActions={
          <Button
            variant="secondary"
            disabled={
              locked ||
              !catalog.checklists.some((checklist) => checklist.active)
            }
            onClick={() => setDialog("checklist")}
          >
            Liste übernehmen
          </Button>
        }
        build={(values, previous) =>
          ({ id: previous?.id ?? "", ...values }) as ServiceTask
        }
        onChange={(tasks) => save({ tasks })}
        columns={[
          {
            id: "task",
            label: "Aufgabe",
            render: (row) => <strong>{row.title}</strong>,
            sortValue: (row) => row.title,
          },
          {
            id: "responsible",
            label: "Verantwortlich",
            render: (row) =>
              catalog.users.find((user) => user.id === row.responsibleId)
                ?.displayName ?? "Nicht zugeordnet",
          },
          {
            id: "due",
            label: "Fällig",
            render: (row) => displayTime(row.dueAt),
          },
          {
            id: "done",
            label: "Status",
            render: (row) => (row.done ? "Erledigt" : "Offen"),
          },
        ]}
      />
      <section className="service-section">
        <header className="service-section-header">
          <h2>Unterlagen</h2>
          <Button
            variant="secondary"
            disabled={locked}
            onClick={() => setDialog("upload")}
          >
            Unterlage hochladen
          </Button>
        </header>
        {service.documents.length ? (
          <ul className="service-document-list">
            {service.documents.map((document) => (
              <li key={document.id}>
                <a
                  href={`/api/services/${service.id}/documents/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {document.filename}
                </a>
                <small>
                  {Math.ceil(document.size / 1024)} KB ·{" "}
                  {displayTime(document.createdAt)}
                </small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="service-empty">Keine Unterlagen.</p>
        )}
      </section>
      <PreparationDialogs
        {...props}
        mode={dialog}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
