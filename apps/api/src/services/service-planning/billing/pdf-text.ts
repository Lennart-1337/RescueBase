export function wrap(
  doc: PDFKit.PDFDocument,
  value: string,
  available: number,
) {
  return value.split(/\r\n|\r|\n/).flatMap((paragraph) => {
    const result: string[] = [];
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (line && doc.widthOfString(`${line} ${word}`) > available) {
        result.push(line);
        line = "";
      }
      for (const char of line ? ` ${word}` : word) {
        if (doc.widthOfString(line + char) > available) {
          result.push(line);
          line = "";
        }
        line += char;
      }
    }
    return [...result, line];
  });
}
export function fixedLines(
  doc: PDFKit.PDFDocument,
  lines: string[],
  x: number,
  y: number,
  width: number,
  leading: number,
  align: "left" | "right" = "left",
) {
  lines.forEach((line, i) => {
    if (line)
      doc.text(line, x, y + i * leading, { width, lineBreak: false, align });
  });
  doc.y = y + lines.length * leading;
}

export function text(
  doc: PDFKit.PDFDocument,
  value: string,
  x: number,
  y: number,
  width: number,
  size: number,
  leading = size * 1.2,
) {
  doc.font("BillingRegular").fontSize(size).fillColor("#111111");
  fixedLines(doc, wrap(doc, value, width), x, y, width, leading);
  return doc.y;
}
