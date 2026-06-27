export interface PdfBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QrSheetLayout {
  leftColumn: PdfBox;
  qrBox: PdfBox;
  linkTop: number;
}

export interface InfoGridCell extends PdfBox {}

export function createQrSheetLayout(pageWidth: number, pageHeight: number): QrSheetLayout {
  const margin = 48;
  const gap = 28;
  const qrSize = Math.min(170, Math.round(pageWidth * 0.29));
  const qrBox = { x: pageWidth - margin - qrSize, y: 92, width: qrSize, height: qrSize };
  const leftColumn = {
    x: margin,
    y: 124,
    width: qrBox.x - gap - margin,
    height: Math.max(180, qrBox.y + qrSize - 124)
  };
  return {
    leftColumn,
    qrBox,
    linkTop: Math.min(pageHeight - 164, qrBox.y + qrSize + 26)
  };
}

export function createInfoGridLayout(input: {
  x: number;
  y: number;
  width: number;
  count: number;
  columns: number;
  gap: number;
}): InfoGridCell[] {
  const columns = Math.max(1, Math.min(input.columns, input.count));
  const cellHeight = 46;
  const cellWidth = (input.width - input.gap * (columns - 1)) / columns;
  const result: InfoGridCell[] = [];

  for (let index = 0; index < input.count; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    result.push({
      x: input.x + column * (cellWidth + input.gap),
      y: input.y + row * (cellHeight + input.gap),
      width: cellWidth,
      height: cellHeight
    });
  }

  return result;
}

export function needsPageBreak(input: {
  currentY: number;
  requiredHeight: number;
  pageHeight: number;
  bottomMargin: number;
  reserve: number;
}) {
  return input.currentY + input.requiredHeight > input.pageHeight - input.bottomMargin - input.reserve;
}
