import { describe, expect, it } from "vitest";
import { groupTemplatePositions, type GroupedTemplatePosition } from "./check";

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
