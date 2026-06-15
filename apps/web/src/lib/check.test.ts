import { describe, expect, it } from "vitest";
import { groupTemplatePositions, summarizeCheck, type GroupedTemplatePosition } from "./check";

describe("groupTemplatePositions", () => {
  it("groups positions with the same module together while preserving item order inside the module", () => {
    const groups = groupTemplatePositions([
      position("1", "Verbandpäckchen", "Verband"),
      position("2", "Tourniquet", "Blutung"),
      position("3", "Dreiecktuch", "Verband"),
      position("4", "Handschuhe")
    ]);

    expect(groups.map((group) => group.title)).toEqual(["Verband", "Blutung", "Ohne Modul"]);
    expect(groups[0]?.positions.map((entry) => entry.articleName)).toEqual(["Verbandpäckchen", "Dreiecktuch"]);
    expect(groups[1]?.positions.map((entry) => entry.articleName)).toEqual(["Tourniquet"]);
    expect(groups[2]?.positions.map((entry) => entry.articleName)).toEqual(["Handschuhe"]);
  });

  it("normalizes empty module names into the default group", () => {
    const groups = groupTemplatePositions([
      position("1", "Handschuhe", " "),
      position("2", "Beatmungstuch")
    ]);

    expect(groups).toEqual<GroupedTemplatePosition[]>([
      {
        key: "ohne-modul",
        title: "Ohne Modul",
        positions: [position("1", "Handschuhe", " "), position("2", "Beatmungstuch")]
      }
    ]);
  });

  it("marks the kit conditional when only non-critical material is missing", () => {
    const summary = summarizeCheck(
      [position("1", "Handschuhe"), { ...position("2", "Beatmungstuch"), requiredQuantity: 2 }],
      [
        { templatePositionId: "1", countedQuantity: 1, discardedExpiredQuantity: 0, note: "" },
        { templatePositionId: "2", countedQuantity: 1, discardedExpiredQuantity: 0, note: "" }
      ]
    );

    expect(summary.effectiveStatus).toBe("CONDITIONAL");
    expect(summary.warnings).toContain("Es fehlen Materialien, aber keine kritische Position.");
  });

  it("marks the kit not ready when a critical position is incomplete", () => {
    const summary = summarizeCheck(
      [{ ...position("1", "Tourniquet"), critical: true }],
      [{ templatePositionId: "1", countedQuantity: 0, discardedExpiredQuantity: 0, note: "" }]
    );

    expect(summary.effectiveStatus).toBe("NOT_READY");
    expect(summary.criticalMissing).toBe(true);
  });
});

function position(id: string, articleName: string, moduleName?: string) {
  return {
    id,
    articleId: `article-${id}`,
    articleName,
    moduleName,
    requiredQuantity: 1,
    unit: "Stück",
    critical: false
  };
}
