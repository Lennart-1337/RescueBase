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

export interface QrLabelLayout {
  outer: PdfBox;
  headerBox: PdfBox;
  textBox: PdfBox;
  codeBox: PdfBox;
  metaBox: PdfBox;
  qrBox: PdfBox;
  qrCaptionBox: PdfBox;
}

export type InfoGridCell = PdfBox;

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

export function createQrLabelLayout(pageWidth: number, pageHeight: number): QrLabelLayout {
  const marginX = 8;
  const marginY = 8;
  const gap = 8;
  const outer = {
    x: marginX,
    y: marginY,
    width: pageWidth - marginX * 2,
    height: pageHeight - marginY * 2
  };
  const headerHeight = 2;
  const qrSize = 62;
  const qrBox = {
    x: outer.x + outer.width - qrSize - 8,
    y: outer.y + headerHeight + 10,
    width: qrSize,
    height: qrSize
  };
  const textBox = {
    x: outer.x + 8,
    y: outer.y + headerHeight + 10,
    width: Math.max(54, qrBox.x - outer.x - gap - 16),
    height: outer.height - headerHeight - 20
  };
  const codeBox = { x: textBox.x, y: textBox.y + 12, width: textBox.width, height: 14 };
  const metaBox = { x: textBox.x, y: textBox.y + 30, width: textBox.width, height: 20 };
  return {
    outer,
    headerBox: {
      x: outer.x,
      y: outer.y,
      width: outer.width,
      height: headerHeight
    },
    textBox,
    codeBox,
    metaBox,
    qrBox,
    qrCaptionBox: {
      x: qrBox.x - 2,
      y: qrBox.y + qrBox.height + 7,
      width: qrBox.width + 4,
      height: 10
    }
  };
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
