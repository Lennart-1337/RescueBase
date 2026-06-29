import { describe, expect, it } from "@jest/globals";
import { createInfoGridLayout, createQrLabelLayout, createQrSheetLayout, needsPageBreak } from "../src/services/report-layout.js";

describe("report layout helpers", () => {
  it("keeps QR sheet content columns separated from the QR code", () => {
    const layout = createQrSheetLayout(595, 842);

    expect(layout.leftColumn.x + layout.leftColumn.width).toBeLessThan(layout.qrBox.x);
    expect(layout.linkTop).toBeGreaterThanOrEqual(layout.qrBox.y + layout.qrBox.height + 20);
  });

  it("requests a page break before content reaches the footer reserve", () => {
    expect(needsPageBreak({ currentY: 620, requiredHeight: 90, pageHeight: 842, bottomMargin: 48, reserve: 96 })).toBe(true);
    expect(needsPageBreak({ currentY: 540, requiredHeight: 90, pageHeight: 842, bottomMargin: 48, reserve: 96 })).toBe(false);
  });

  it("builds balanced info-grid cards in two columns", () => {
    const cards = createInfoGridLayout({ columns: 2, count: 4, gap: 16, width: 499, x: 48, y: 120 });

    expect(cards).toHaveLength(4);
    expect(cards[0]).toMatchObject({ x: 48, y: 120 });
    expect(cards[1]?.x).toBeGreaterThan(cards[0]!.x + cards[0]!.width);
    expect(cards[2]?.y).toBeGreaterThan(cards[0]!.y);
    expect(cards[0]!.width).toBe(cards[1]!.width);
  });

  it("keeps QR label text and code areas separated on the 62 x 60 mm format", () => {
    const layout = createQrLabelLayout(175.75, 170.08);

    expect(layout.textBox.x + layout.textBox.width).toBeLessThan(layout.qrBox.x);
    expect(layout.qrCaptionTop).toBeGreaterThanOrEqual(layout.qrBox.y + layout.qrBox.height + 4);
    expect(layout.qrCaptionTop).toBeLessThan(170.08);
  });
});
