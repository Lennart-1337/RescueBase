import { ServiceCollection } from "./collection";
import type { ServiceEditorProps } from "./editor";
import { datetime, options } from "./form";
import { displayTime, formatMinutes } from "./time";
import { qualificationLabels, type ServiceAssignment } from "./types";
export function PersonnelAssignments({ service, catalog, save, locked }: ServiceEditorProps) {
  const assignmentFields = [
    options(
      "personId",
      "Person",
      catalog.people.filter((person) => person.active),
      true,
    ),
    options("positionId", "Position", service.positions, true),
    datetime("startsAt", "Geplanter Beginn", true),
    datetime("endsAt", "Geplantes Ende", true),
    datetime("actualStartsAt", "Tatsächlicher Beginn"),
    datetime("actualEndsAt", "Tatsächliches Ende"),
  ];
  const groupedAssignmentFields = assignmentFields.map((field, index) => ({
    ...field,
    group: index < 2 ? "Zuteilung" : index < 4 ? "Geplant" : "Tatsächlich",
    disclosure: index >= 4,
  }));
  const name = (id: string) =>
    catalog.people.find((person) => person.id === id)?.name ??
    "Person nicht verfügbar";
  return (
      <ServiceCollection<ServiceAssignment>
        title="Personal"
        createLabel="Person einteilen"
        rows={service.assignments}
        fields={groupedAssignmentFields}
        defaults={{
          startsAt: service.startsAt,
          endsAt: service.endsAt,
          hourlyRate: "0",
        }}
        locked={locked}
        build={(values, previous) => {
          const position = service.positions.find((row) => row.id === values.positionId);
          if (!position) throw new Error("Position nicht verfügbar.");
          return { id: previous?.id ?? "", hourlyRate: previous?.hourlyRate ?? "0",
            ...values, qualification: position.qualification } as ServiceAssignment;
        }}
        onChange={(assignments) => save({ assignments })}
        columns={[
          {
            id: "person",
            label: "Person",
            render: (row) => (
              <>
                <strong>{name(row.personId)}</strong>
                <small>{qualificationLabels[service.positions.find((position) => position.id === row.positionId)?.qualification ?? row.qualification]}</small>
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
                <small>bis {displayTime(row.endsAt)}</small>
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
                      ),
                    )}
                  </small>
                </>
              ) : (
                "Nicht erfasst"
              ),
          },
        ]}
      />
  );
}
