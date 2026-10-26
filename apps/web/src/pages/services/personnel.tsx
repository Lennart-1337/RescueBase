import { ServiceCollection } from "./collection";
import type { ServiceEditorProps } from "./editor";
import { datetime, number, options, text, type ServiceField } from "./form";
import { displayTime, formatMinutes } from "./time";
import {
  qualificationLabels,
  qualifications,
  type Qualification,
  type ServiceAssignment,
  type ServicePosition,
} from "./types";
const qualificationField: ServiceField = {
  name: "qualification",
  label: "Qualifikation",
  required: true,
  options: qualifications.map((value) => ({
    value,
    label: qualificationLabels[value],
  })),
};
export function Personnel({
  service,
  catalog,
  save,
  locked,
}: ServiceEditorProps) {
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
  const assignmentFields: ServiceField[] = [
    options(
      "personId",
      "Person",
      catalog.people.filter((person) => person.active),
      true,
    ),
    options("positionId", "Position", service.positions, true),
    qualificationField,
    datetime("startsAt", "Geplanter Beginn", true),
    datetime("endsAt", "Geplantes Ende", true),
    number("breakMinutes", "Geplante Pause (Minuten)", true),
    datetime("actualStartsAt", "Tatsächlicher Beginn"),
    datetime("actualEndsAt", "Tatsächliches Ende"),
    number("actualBreakMinutes", "Tatsächliche Pause (Minuten)", true),
  ];
  const groupedAssignmentFields = assignmentFields.map((field, index) => ({
    ...field,
    group: index < 3 ? "Zuteilung" : index < 6 ? "Geplant" : "Tatsächlich",
    disclosure: index >= 6,
  }));
  const name = (id: string) =>
    catalog.people.find((person) => person.id === id)?.name ??
    "Person nicht verfügbar";
  return (
    <div className="service-stack">
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
              `${row.quantity} / ${service.assignments.filter((assignment) => assignment.positionId === row.id).length}`,
          },
        ]}
      />
      <ServiceCollection<ServiceAssignment>
        title="Personal"
        createLabel="Person einteilen"
        rows={service.assignments}
        fields={groupedAssignmentFields}
        defaults={{
          startsAt: service.startsAt,
          endsAt: service.endsAt,
          breakMinutes: 0,
          actualBreakMinutes: 0,
        }}
        locked={locked}
        build={(values, previous) =>
          ({
            id: previous?.id ?? "",
            ...values,
            qualification: values.qualification as Qualification,
          }) as ServiceAssignment
        }
        onChange={(assignments) => save({ assignments })}
        columns={[
          {
            id: "person",
            label: "Person",
            render: (row) => (
              <>
                <strong>{name(row.personId)}</strong>
                <small>{qualificationLabels[row.qualification]}</small>
              </>
            ),
            sortValue: (row) => name(row.personId),
          },
          {
            id: "position",
            label: "Position",
            render: (row) =>
              service.positions.find(
                (position) => position.id === row.positionId,
              )?.name ?? "Position nicht verfügbar",
          },
          {
            id: "planned",
            label: "Geplant",
            render: (row) => (
              <>
                {displayTime(row.startsAt)}
                <small>
                  bis {displayTime(row.endsAt)} · Pause {row.breakMinutes} Min.
                </small>
              </>
            ),
          },
          {
            id: "actual",
            label: "Tatsächlich",
            render: (row) =>
              row.actualStartsAt && row.actualEndsAt ? (
                <>
                  {displayTime(row.actualStartsAt)}
                  <small>
                    bis {displayTime(row.actualEndsAt)} ·{" "}
                    {formatMinutes(
                      Math.round(
                        (Date.parse(row.actualEndsAt) -
                          Date.parse(row.actualStartsAt)) /
                          60000,
                      ) - row.actualBreakMinutes,
                    )}
                  </small>
                </>
              ) : (
                "Nicht erfasst"
              ),
          },
        ]}
      />
    </div>
  );
}
