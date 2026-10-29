import { displayDate, type BillingPdfModel } from "./pdf-types.js";
export function closingText(model: BillingPdfModel) {
  const terms =
    model.kind === "OFFER"
      ? [
          "Zahlbar ohne Abzüge innerhalb von 14 Tagen nach Erhalt der Rechnung per Überweisung.",
          `Dieses Angebot gilt bis zum ${displayDate(model.validUntil!)}. Preisänderungen vorbehalten. Dieses Angebot ist freibleibend.`,
          "Sollte die Veranstaltung weniger als 3 Tage vorher abgesagt werden, behalten wir uns vor, eine Aufwandsentschädigung von 50 € zu erheben.",
        ]
      : [
          "Wir bitten den vollständigen Betrag innerhalb von 14 Tagen ab Rechnungsdatum ohne Abzüge auf das untenstehende Konto zu überweisen.",
        ];
  return [
    ...terms,
    "Der Rechnungsbetrag enthält gemäß § 19 Abs. 1 Umsatzsteuergesetz keine Umsatzsteuer.",
    "Mit freundlichen Grüßen\nAnna-Lena Pawelczak\nBeauftragte Sanitätsdienste",
    `${model.kind === "OFFER" ? "Dieses Angebot" : "Diese Rechnung"} ist elektronisch erstellt und ohne Unterschrift gültig.`,
  ];
}
