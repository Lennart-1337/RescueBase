import { defaultBillingSettings } from "../src/settings/service-billing/defaults.js";
import { normalizeBillingSettings } from "../src/settings/service-billing/validation.js";
describe("service billing settings validation", () => {
  it("starts with the supplied DLRG address, bank and term defaults", () => {
    expect(normalizeBillingSettings(defaultBillingSettings)).toMatchObject({
      street: "Döpperstraße 47",
      postalCode: "47506",
      offerValidityDays: 30,
      paymentTermDays: 14,
      iban: "DE08354500001420201855",
    });
  });
  it("normalizes line endings, whitespace and bank identifiers", () => {
    const data = normalizeBillingSettings({
      ...defaultBillingSettings,
      organizationName: " DLRG Test ",
      organizationDetails: "Landesverband\rBezirk\r\nOrtsgruppe",
      iban: "de08 3545 0000 1420 2018 55",
      bic: "weladed1mor",
    });
    expect(data.organizationName).toBe("DLRG Test");
    expect(data.organizationDetails).toBe("Landesverband\nBezirk\nOrtsgruppe");
    expect(data.iban).toBe("DE08354500001420201855");
    expect(data.bic).toBe("WELADED1MOR");
  });
  it.each([
    { street: "" },
    { iban: "DE09354500001420201855" },
    { bic: "INVALID" },
    { email: "abc" },
    { website: "javascript:alert(1)" },
    { showLogo: "true" },
    { offerValidityDays: 0 },
    { paymentTermDays: 1.5 },
    { offerValidityDays: 366 },
    { organizationName: "A\nB" },
    { footerText: Array(9).fill("Zeile").join("\r") },
    { city: "Bad\u0000City" },
    { random: "field" },
  ])("rejects malformed settings %j", (change) => {
    expect(() =>
      normalizeBillingSettings({ ...defaultBillingSettings, ...change }),
    ).toThrow();
  });
  it("rejects incomplete data and permits optional contact and footer fields to be cleared", () => {
    expect(() =>
      normalizeBillingSettings({ organizationName: "Verein" }),
    ).toThrow();
    expect(
      normalizeBillingSettings({
        ...defaultBillingSettings,
        email: "",
        phone: "",
        website: "",
        bic: "",
        footerText: "",
        taxNote: "",
        signatoryName: "",
        signatoryRole: "",
      }),
    ).toMatchObject({ email: "", taxNote: "" });
  });
});
