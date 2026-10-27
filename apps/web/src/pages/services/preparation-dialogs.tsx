import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, Field } from "../../components/ui";
import { ServiceForm, options } from "./form";
import { uploadDocument } from "./api";
import { newId, type ServiceEditorProps } from "./editor";
export type PreparationDialog = "checklist" | "upload" | null;
export function PreparationDialogs({
  service,
  catalog,
  save,
  locked,
  mode,
  onClose,
}: ServiceEditorProps & { mode: PreparationDialog; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const client = useQueryClient();
  const close = () => {
    setFile(null);
    onClose();
  };
  return (
    <Dialog
      title={mode === "upload" ? "Unterlage hochladen" : "Liste übernehmen"}
      open={mode !== null}
      onClose={close}
    >
      {mode === "checklist" ? (
        <ServiceForm
          hideLegend
          title="Vorbereitungsliste"
          disabled={locked}
          fields={[
            options(
              "checklistId",
              "Vorbereitungsliste",
              catalog.checklists.filter((checklist) => checklist.active),
              true,
            ),
          ]}
          submitLabel="Aufgaben hinzufügen"
          onSubmit={async (values) => {
            const checklist = catalog.checklists.find(
              (row) => row.id === values.checklistId,
            );
            if (!checklist)
              throw new Error("Vorbereitungsliste nicht gefunden.");
            await save({
              tasks: [
                ...service.tasks,
                ...checklist.tasks.map((title) => ({
                  id: newId(),
                  title,
                  responsibleId: null,
                  dueAt: null,
                  done: false,
                })),
              ],
            });
            close();
          }}
        />
      ) : mode === "upload" ? (
        <ServiceForm
          hideLegend
          title="Unterlage"
          fields={[]}
          disabled={locked}
          submitLabel="Hochladen"
          onSubmit={async () => {
            if (!file) throw new Error("Bitte eine Datei auswählen.");
            await uploadDocument(service, file);
            await client.invalidateQueries({ queryKey: ["services"] });
            close();
          }}
        >
          <Field label="Datei (PDF, PNG oder JPEG; höchstens 20 MB)" required>
            <input
              required
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </Field>
        </ServiceForm>
      ) : null}
    </Dialog>
  );
}
