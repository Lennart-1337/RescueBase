import { buildAlertWarnings, type AlertSource } from "../src/alerts/alert-engine.js";

describe("alert engine", () => {
  it("creates expiry warnings for batches inside the warning window", () => {
    const warnings = buildAlertWarnings(
      {
        batches: [
          {
            id: "batch-1",
            articleId: "article-1",
            articleName: "Verbandpäckchen",
            locationId: "loc-1",
            locationName: "Hauptlager",
            lotNumber: "LOT-1",
            expiresAt: new Date("2026-07-01T00:00:00.000Z"),
            quantity: 4
          }
        ],
      },
      new Date("2026-06-15T00:00:00.000Z"),
      30
    );

    expect(warnings).toEqual([
      expect.objectContaining({
        category: "EXPIRY",
        sourceType: "BATCH" satisfies AlertSource,
        sourceId: "batch-1",
        title: expect.stringContaining("Ablauf"),
        locationId: "loc-1"
      })
    ]);
  });

  it("creates shortage warnings for uncovered inventory targets", () => {
    const warnings = buildAlertWarnings(
      {
        batches: [],
        targets: [
          {
            id: "target-1",
            articleId: "article-3",
            articleName: "Infusionsset",
            locationId: "loc-3",
            locationName: "RTW 1",
            targetQuantity: 12,
            currentQuantity: 5,
            shortageQuantity: 7,
            unit: "Stück"
          }
        ]
      },
      new Date("2026-06-15T00:00:00.000Z"),
      90
    );

    expect(warnings).toEqual([
      expect.objectContaining({
        category: "SHORTAGE",
        sourceType: "INVENTORY_TARGET" satisfies AlertSource,
        sourceId: "target-1",
        title: "Sollbestand unterschritten: Infusionsset",
        locationId: "loc-3"
      })
    ]);
    expect(warnings[0]?.metadata).toMatchObject({
      articleId: "article-3",
      targetQuantity: 12,
      currentQuantity: 5,
      shortageQuantity: 7
    });
  });

  it("warns only after a kit's monthly check is overdue", () => {
    const kit = { id: "kit-1", name: "Notfallrucksack 1", code: "NR-01", locationId: "loc-1", locationName: "Hauptlager", createdAt: new Date("2026-05-31T00:00:00.000Z"), lastCheckedAt: new Date("2026-05-31T00:00:00.000Z") };
    const warnings = buildAlertWarnings({ batches: [], kits: [kit] }, new Date("2026-07-01T00:00:00.000Z"));

    expect(warnings).toEqual([expect.objectContaining({ category: "KIT_CHECK_DUE", sourceType: "KIT", sourceId: "kit-1", dueAt: "2026-06-30T00:00:00.000Z" })]);
  });

  it("uses the configured kit check interval and warning lead time", () => {
    const kit = { id: "kit-1", name: "Notfallrucksack 1", code: "NR-01", locationId: "loc-1", locationName: "Hauptlager", createdAt: new Date("2026-05-01T00:00:00.000Z"), lastCheckedAt: new Date("2026-05-01T00:00:00.000Z") };
    const input = { batches: [], kits: [kit], kitCheckSchedule: { enabled: true, intervalMonths: 2, warningLeadDays: 7 } };

    expect(buildAlertWarnings(input, new Date("2026-06-23T00:00:00.000Z"))).toHaveLength(0);
    expect(buildAlertWarnings(input, new Date("2026-06-24T00:00:00.000Z"))).toHaveLength(1);
    expect(buildAlertWarnings({ ...input, kitCheckSchedule: { ...input.kitCheckSchedule, enabled: false } }, new Date("2026-07-02T00:00:00.000Z"))).toHaveLength(0);
  });
});
