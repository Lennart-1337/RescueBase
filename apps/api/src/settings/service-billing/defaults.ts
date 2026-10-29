export interface BillingSettingsData {
  organizationName: string;
  organizationDetails: string;
  department: string;
  street: string;
  postalCode: string;
  city: string;
  email: string;
  phone: string;
  website: string;
  bankName: string;
  iban: string;
  bic: string;
  legalDetails: string;
  footerText: string;
  signatoryName: string;
  signatoryRole: string;
  taxNote: string;
  offerTerms: string;
  offerValidityDays: number;
  paymentTermDays: number;
  showLogo: boolean;
}
export const defaultBillingSettings: BillingSettingsData = {
  organizationName: "DLRG Ortsgruppe Neukirchen-Vluyn e.V.",
  organizationDetails: "Landesverband Nordrhein\nBezirk Kreis Wesel",
  department: "Beauftragte Sanitätsdienste",
  street: "Döpperstraße 47",
  postalCode: "47506",
  city: "Neukirchen-Vluyn",
  email: "leitereinsatz@neukirchen-vluyn.dlrg.de",
  phone: "",
  website: "https://neukirchen-vluyn.dlrg.de",
  bankName: "Sparkasse am Niederrhein\n(Geschäftsbereich Neukirchen-Vluyn)",
  iban: "DE08354500001420201855",
  bic: "WELADED1MOR",
  legalDetails:
    "Rechtsform: eingetragener Verein (e.V.)\nAmtsgericht: Kleve / VR 41098\nVertretungsberechtigung gemäß § 26 BGB\n1. Vors. Marina Pauly\nStv. Vors. Arne Pauly\nSteuerNr.: 119/5714/0534",
  footerText:
    "Die Deutsche Lebens-Rettungs-Gesellschaft ist Spitzenverband im Deutschen Olympischen Sportbund (DOSB), Mitglied im Deutschen Paritätischen Wohlfahrtsverband, im Deutschen Spendenrat, Mitglied der International Life Saving Federation (ILS) und der ILS-Europe.",
  signatoryName: "Anna-Lena Pawelczak",
  signatoryRole: "Sanitätsdienst Beauftragte",
  taxNote:
    "Der Rechnungsbetrag enthält gemäß § 19 Abs. 1 Umsatzsteuergesetz keine Umsatzsteuer.",
  offerTerms:
    "Preisänderungen vorbehalten. Dieses Angebot ist freibleibend.\nSollte die Veranstaltung weniger als 3 Tage vorher abgesagt werden, behalten wir uns vor, eine Aufwandsentschädigung von 50 € zu erheben.",
  offerValidityDays: 30,
  paymentTermDays: 14,
  showLogo: true,
};
