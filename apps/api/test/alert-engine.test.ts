import { buildAlertWarnings, computeControlDueDate, type AlertSource } from "../src/alerts/alert-engine.js";

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
        devices: []
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

  it("creates STK and MTK warnings from the latest control date and interval", () => {
    const warnings = buildAlertWarnings(
      {
        batches: [],
        devices: [
          {
            id: "device-1",
            articleId: "article-2",
            articleName: "Defibrillator",
            locationId: "loc-2",
            locationName: "Fahrzeug 1",
            name: "DEF-01",
            serialNumber: "SN-1",
            inventoryNumber: "INV-1",
            lastStkAt: new Date("2025-07-01T00:00:00.000Z"),
            lastMtkAt: new Date("2025-07-01T00:00:00.000Z"),
            stkIntervalMonths: 12,
            mtkIntervalMonths: 12,
            article: { stkRequired: true, mtkRequired: true, stkIntervalMonths: 12, mtkIntervalMonths: 12 }
          }
        ]
      },
      new Date("2026-06-15T00:00:00.000Z"),
      90
    );

    expect(warnings.map((warning) => warning.category)).toEqual(expect.arrayContaining(["STK_DUE", "MTK_DUE"]));
    expect(warnings.find((warning) => warning.category === "STK_DUE")?.dueAt).toBe("2026-07-01T00:00:00.000Z");
  });

  it("creates shortage warnings for uncovered inventory targets", () => {
    const warnings = buildAlertWarnings(
      {
        batches: [],
        devices: [],
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

  it("calculates due dates by month with a missing control date falling back to now", () => {
    expect(computeControlDueDate(null, 12, new Date("2026-06-15T00:00:00.000Z"))).toBe("2026-06-15T00:00:00.000Z");
    expect(computeControlDueDate(new Date("2026-01-31T00:00:00.000Z"), 1, new Date("2026-06-15T00:00:00.000Z"))).toBe("2026-02-28T00:00:00.000Z");
  });
});
