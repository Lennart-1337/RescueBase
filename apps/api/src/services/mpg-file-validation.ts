import { BadRequestException } from "@nestjs/common";

export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

export function inspectUpload(buffer: Buffer, claimedType: string): string {
  if (!buffer.length || buffer.length > MAX_DOCUMENT_BYTES) {
    throw new BadRequestException("Dokumente müssen zwischen 1 Byte und 20 MB groß sein.");
  }
  let detected: string | undefined;
  if (buffer.subarray(0, 5).toString("ascii") === "%PDF-" && buffer.subarray(-1024).includes(Buffer.from("%%EOF"))) detected = "application/pdf";
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && buffer.subarray(-12, -8).equals(Buffer.alloc(4)) && buffer.subarray(-8, -4).toString() === "IEND") detected = "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9) detected = "image/jpeg";
  if (!detected || detected !== claimedType) throw new BadRequestException("Nur PDF, JPEG und PNG mit passendem Dateiinhalt sind erlaubt.");
  return detected;
}

export function safeFilename(name: string): string {
  const filename = name.replace(/\\/g, "/").split("/").pop()!.split("").filter(character => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127).join("").trim();
  if (!filename || filename === "." || filename === "..") throw new BadRequestException("Dateiname fehlt.");
  return filename.slice(0, 180);
}
