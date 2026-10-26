import { datetime, text, type ServiceField } from "./form";
import { emptyOutcome, type Catalog, type ServiceWrite } from "./types";
export function overviewFields(catalog: Catalog): ServiceField[] {
  const additional = (field: ServiceField): ServiceField => ({
    ...field,
    group: "Weitere Angaben",
    disclosure: true,
  });
  const separate = (field: ServiceField): ServiceField => ({
    ...field,
    when: { field: "separateServiceTimes", equals: true },
  });
  return [
    text("title", "Dienstbezeichnung", true),
    text("eventType", "Veranstaltungsart", true),
    text("customer", "Auftraggeber", true),
    text("location", "Veranstaltungsort", true),
    datetime("eventStartsAt", "Veranstaltungsbeginn", true),
    datetime("eventEndsAt", "Veranstaltungsende", true),
    {
      name: "responsibleId",
      label: "Verantwortlich",
      options: catalog.users.map((user) => ({
        value: user.id,
        label: user.displayName,
      })),
    },
    {
      name: "separateServiceTimes",
      label: "Abweichende Dienstzeiten",
      type: "checkbox",
    },
    separate(datetime("startsAt", "Eigener Dienstbeginn", true)),
    separate(datetime("endsAt", "Eigenes Dienstende", true)),
    additional(text("organizer", "Veranstalter")),
    additional(text("leadOrganization", "Federführender Verband")),
    additional(text("contactName", "Ansprechpartner")),
    additional({ name: "contactEmail", label: "E-Mail", type: "email" }),
    additional(text("contactPhone", "Telefon")),
    additional({
      name: "description",
      label: "Auftragsbeschreibung",
      type: "textarea",
    }),
    additional({
      name: "requirements",
      label: "Örtliche Anforderungen",
      type: "textarea",
    }),
    additional({
      name: "supportOnly",
      label: "Unterstützungsauftrag: nur eigener Anteil",
      type: "checkbox",
    }),
  ];
}

export function emptyService(): ServiceWrite {
  return {
    title: "",
    eventType: "",
    customer: "",
    organizer: "",
    leadOrganization: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    location: "",
    eventStartsAt: "",
    eventEndsAt: "",
    startsAt: "",
    endsAt: "",
    responsibleId: null,
    description: "",
    requirements: "",
    supportOnly: false,
    agreedRevenue: null,
    positions: [],
    assignments: [],
    reservations: [],
    tasks: [],
    lines: [],
    outcome: { ...emptyOutcome },
  };
}
export function overviewInitial(
  values: Record<string, unknown>,
): Record<string, unknown> & { separateServiceTimes: boolean } {
  const different = (duty: string, event: string) =>
    Boolean(values[duty]) &&
    (!values[event] ||
      Date.parse(String(values[duty])) !== Date.parse(String(values[event])));
  return {
    ...values,
    separateServiceTimes:
      typeof values.separateServiceTimes === "boolean"
        ? values.separateServiceTimes
        : different("startsAt", "eventStartsAt") ||
          different("endsAt", "eventEndsAt"),
  };
}
export function normalizeOverview(values: Record<string, unknown>) {
  const { separateServiceTimes, ...body } = overviewInitial(values);
  if (!separateServiceTimes) {
    body.startsAt = body.eventStartsAt;
    body.endsAt = body.eventEndsAt;
  }
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      value === null && key !== "responsibleId" ? "" : value,
    ]),
  );
}
