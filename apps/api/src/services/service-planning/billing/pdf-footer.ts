import { left, width } from "./pdf-layout.js";
export function footer(doc: PDFKit.PDFDocument, page: number, pages: number) {
  const margin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
  const columns = [
    "Sparkasse am Niederrhein\n(Geschäftsbereich Neukirchen-Vluyn)\nIBAN: DE08 3545 0000 1420 2018 55\nBIC: WELADED1MOR",
    "Rechtsform: eingetragener Verein (e.V.)\nAmtsgericht: Kleve / VR 41098\nVertretungsberechtigung gemäß § 26 BGB\n1. Vors. Marina Pauly\nStv. Vors. Arne Pauly\nSteuerNr.: 119/5714/0534",
    "Die Deutsche Lebens-Rettungs-Gesellschaft ist Spitzenverband im Deutschen Olympischen Sportbund (DOSB), Mitglied im Deutschen Paritätischen Wohlfahrtsverband, im Deutschen Spendenrat, Mitglied der International Life Saving Federation (ILS) und der ILS-Europe.",
  ];
  doc.font("Helvetica").fontSize(6).fillColor("#333333");
  columns.forEach((text, index) =>
    doc.text(text, left + index * 171, 755, {
      width: 157,
      lineGap: 1,
      lineBreak: true,
      align: "left",
    }),
  );
  doc.fontSize(7).text(`Seite ${page} von ${pages}`, left, 827, {
    width,
    align: "right",
    lineBreak: false,
  });
  doc.page.margins.bottom = margin;
}
