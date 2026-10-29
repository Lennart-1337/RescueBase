import { ServiceCollection } from "./collection";
import type { ServiceEditorProps } from "./editor";
import { number, text, type ServiceField } from "./form";
import { qualificationLabels, qualifications, type ServicePosition } from "./types";
const qualificationField: ServiceField = {
  name: "qualification",
  label: "Qualifikation",
  required: true,
  options: qualifications.map((value) => ({
    value,
    label: qualificationLabels[value],
  })),
};
export function PersonnelPositions({ service, save, locked }: ServiceEditorProps) {
  const positionFields: ServiceField[] = [
    text("name", "Position", true),
    qualificationField,
    {
      name: "leader",
      label: "Führungsfunktion erforderlich",
      type: "checkbox",
    },
    { ...number("quantity", "Benötigte Anzahl", true), min: 1 },
    text("team", "Team / Posten"),
  ];
  return (
      <ServiceCollection<ServicePosition>
        title="Positionen"
        createLabel="Position hinzufügen"
        rows={service.positions}
        fields={positionFields}
        defaults={{ leader: false, quantity: 1 }}
        locked={locked}
        build={(values, previous) =>
          ({ id: previous?.id ?? "", ...values }) as ServicePosition
        }
        onChange={(positions) => save({ positions })}
        columns={[
          {
            id: "position",
            label: "Position",
            render: (row) => (
              <>
                <strong>{row.name}</strong>
                <small>{row.team}</small>
              </>
            ),
            sortValue: (row) => row.name,
          },
          {
            id: "qualification",
            label: "Anforderung",
            render: (row) =>
              `${qualificationLabels[row.qualification]}${row.leader ? " · Führungskraft" : ""}`,
          },
          {
            id: "quantity",
            label: "Bedarf / Besetzt",
            render: (row) =>
              `${row.quantity} / ${new Set(service.assignments.filter((assignment) => assignment.positionId === row.id).map((assignment) => assignment.personId)).size}`,
          },
        ]}
      />
  );
}
