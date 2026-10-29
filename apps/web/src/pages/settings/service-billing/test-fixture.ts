import type { ServiceBillingSettings } from "../../../lib/service-billing-settings";
export const billingSettingsFixture: ServiceBillingSettings = {
  organizationName: "DLRG Ortsgruppe Neukirchen-Vluyn e.V.", organizationDetails: "Landesverband Nordrhein\nBezirk Kreis Wesel", department: "Beauftragte Sanitätsdienste",
  street: "Döpperstraße 47", postalCode: "47506", city: "Neukirchen-Vluyn", email: "leitereinsatz@neukirchen-vluyn.dlrg.de", phone: "", website: "https://neukirchen-vluyn.dlrg.de",
  bankName: "Sparkasse am Niederrhein\n(Geschäftsbereich Neukirchen-Vluyn)", iban: "DE08354500001420201855", bic: "WELADED1MOR",
  legalDetails: "Rechtsform: eingetragener Verein (e.V.)\nAmtsgericht: Kleve / VR 41098", footerText: "Deutsche Lebens-Rettungs-Gesellschaft",
  signatoryName: "Anna-Lena Pawelczak", signatoryRole: "Beauftragte Sanitätsdienste", taxNote: "Der Rechnungsbetrag enthält gemäß § 19 Abs. 1 Umsatzsteuergesetz keine Umsatzsteuer.", offerTerms: "Dieses Angebot ist freibleibend.",
  offerValidityDays: 30, paymentTermDays: 14, showLogo: true, version: 2,
};
