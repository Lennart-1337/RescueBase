import { describe, expect, it } from "vitest";
import { changedFields, isMeierArticle, selectedChanges } from "./changes";

it("recognizes trusted HTTPS product links without trusting lookalike hosts", () => {
  expect(
    isMeierArticle({ articleUrl: "https://www.meier-medizintechnik.de/a/123" }),
  ).toBe(true);
  expect(
    isMeierArticle({
      articleUrl: "https://meier-medizintechnik.de.evil.test/a/123",
    }),
  ).toBe(false);
  expect(
    isMeierArticle({ articleUrl: "http://www.meier-medizintechnik.de/a/123" }),
  ).toBe(false);
});
describe("reconciliation changes", () => {
  it("offers only available changed values and preserves false and zero", () => {
    const fields = changedFields(
      {
        name: "Alt",
        unit: "Stück",
        medicalDevice: true,
        defaultGrossPriceCents: 100,
      },
      {
        name: "Neu",
        articleUrl: "https://www.meier-medizintechnik.de/a/123",
        medicalDevice: false,
        defaultGrossPriceCents: 0,
      },
    );
    expect(fields.map((entry) => entry.key)).toEqual([
      "name",
      "articleUrl",
      "defaultGrossPriceCents",
      "medicalDevice",
    ]);
    expect(fields.every((entry) => !entry.selected)).toBe(true);
    expect(selectedChanges(fields)).toEqual({});
    expect(
      selectedChanges(
        fields.map((entry) => ({
          ...entry,
          selected: entry.key === "medicalDevice",
        })),
      ),
    ).toEqual({ medicalDevice: false });
  });
  it("does not clear missing values or include unchanged values", () => {
    expect(
      changedFields(
        { name: "Name", manufacturer: "Manuell" },
        { name: "Name" },
      ),
    ).toEqual([]);
  });
});
