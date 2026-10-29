import { calculateAttendanceAmount } from "@rescuebase/domain";
import { displayTime, formatMinutes, money } from "./time";
import type { Catalog, ServiceAssignment } from "./types";
function duration(start: string | null, end: string | null) {
  return start && end ? (Date.parse(end) - Date.parse(start)) / 60_000 : null;
}
function amount(start: string | null, end: string | null, rate: string) {
  if (!start || !end) return "Nicht erfasst";
  try {
    return money(calculateAttendanceAmount(start, end, rate));
  } catch {
    return "–";
  }
}
export function PersonnelPrices({
  assignments,
  people,
  rates,
  onRate,
}: {
  assignments: ServiceAssignment[];
  people: Catalog["people"];
  rates: string[];
  onRate: (index: number, value: string) => void;
}) {
  const names = new Map(people.map((person) => [person.id, person.name]));
  if (!assignments.length)
    return (
      <p className="service-tool-status">Noch kein Personal eingeteilt.</p>
    );
  return (
    <div className="service-scroll">
      <table className="service-simple-table service-pricing-table">
        <caption className="service-pricing-hidden">Personalpreise</caption>
        <thead>
          <tr>
            <th>Person</th>
            <th>Stundenpreis (EUR)</th>
            <th>Geplant</th>
            <th>Tatsächlich</th>
          </tr>
        </thead>
        <tbody>
          {assignments.map((row, index) => {
            const name = names.get(row.personId) ?? "Person nicht verfügbar";
            const repeated = assignments.filter((assignment) => assignment.personId === row.personId).length > 1;
            const period = `${displayTime(row.startsAt)} – ${displayTime(row.endsAt)}`;
            return (
              <tr key={row.id}>
                <th scope="row">{name}{repeated ? <small>{period}</small> : null}</th>
                <td className="service-person-rate" data-label="Stundenpreis (EUR)">
                  <div className="field"><input
                    aria-label={`Stundenpreis für ${name}${repeated ? ` · ${period}` : ""} (EUR)`}
                    type="text"
                    inputMode="decimal"
                    required
                    value={rates[index]}
                    onChange={(event) => onRate(index, event.target.value)}
                  /></div>
                </td>
                <td data-label="Geplant">
                  {formatMinutes(duration(row.startsAt, row.endsAt))}
                  <small>
                    {amount(row.startsAt, row.endsAt, row.hourlyRate)}
                  </small>
                </td>
                <td data-label="Tatsächlich">
                  {formatMinutes(
                    duration(row.actualStartsAt, row.actualEndsAt),
                  )}
                  <small>
                    {amount(
                      row.actualStartsAt,
                      row.actualEndsAt,
                      row.hourlyRate,
                    )}
                  </small>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
