import { inspectUpload, safeFilename } from "../src/services/mpg-file-validation.js";

describe("MPG private documents", () => {
  it("accepts a PDF with a matching signature", () => {
    expect(inspectUpload(Buffer.from("%PDF-1.7\n%%EOF"), "application/pdf")).toBe("application/pdf");
  });
  it("rejects mismatched MIME, active content types, empty and oversized uploads", () => {
    expect(() => inspectUpload(Buffer.from("<script>"), "application/pdf")).toThrow();
    expect(() => inspectUpload(Buffer.from("%PDF-1.7"), "image/png")).toThrow();
    expect(() => inspectUpload(Buffer.from("<svg/>"), "image/svg+xml")).toThrow();
    expect(() => inspectUpload(Buffer.alloc(0), "image/jpeg")).toThrow();
    expect(() => inspectUpload(Buffer.alloc(20 * 1024 * 1024 + 1), "application/pdf")).toThrow();
  });
  it("strips path and header characters from filenames", () => {
    expect(safeFilename("../../Prüfung\r\n.pdf")).toBe("Prüfung.pdf");
    expect(safeFilename("C:\\temp\\Bericht.pdf")).toBe("Bericht.pdf");
  });
});
