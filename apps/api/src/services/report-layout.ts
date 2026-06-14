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

export function needsPageBreak(input: {
  currentY: number;
  requiredHeight: number;
  pageHeight: number;
  bottomMargin: number;
  reserve: number;
}) {
  return input.currentY + input.requiredHeight > input.pageHeight - input.bottomMargin - input.reserve;
}
