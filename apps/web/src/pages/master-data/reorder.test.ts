import { describe, expect, it } from "vitest";
import { moveItem, reorderVisibleIds } from "./reorder";

describe("moveItem", () => {
  it("moves entries to a different index", () => {
    expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });
});

describe("reorderVisibleIds", () => {
  it("reorders only the visible subset within the full article order", () => {
    expect(reorderVisibleIds(["a", "hidden", "b"], ["a", "b"], "b", "up")).toEqual(["b", "hidden", "a"]);
  });
});
