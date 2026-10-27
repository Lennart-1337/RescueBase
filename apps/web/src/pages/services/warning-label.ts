import type { Catalog, Service, ServiceWarning } from "./types";
export function warningLabel(
  warning: ServiceWarning,
  service: Service,
  catalog?: Catalog,
): string {
  if (!warning.entityId) return warning.message;
  const assignment = service.assignments?.find(
    (row) => row.id === warning.entityId,
  );
  const position = service.positions?.find(
    (row) => row.id === (assignment?.positionId ?? warning.entityId),
  );
  const reservation = service.reservations?.find(
    (row) => row.id === warning.entityId,
  );
  const person = catalog?.people.find((row) => row.id === assignment?.personId);
  const resource =
    reservation &&
    [
      ...(catalog?.vehicles ?? []),
      ...(catalog?.kits ?? []),
      ...(catalog?.devices ?? []),
    ].find((row) => row.id === reservation.resourceId);
  const context = [person?.name, position?.name, resource?.name]
    .filter(Boolean)
    .join(" · ");
  return context ? `${context}: ${warning.message}` : warning.message;
}
