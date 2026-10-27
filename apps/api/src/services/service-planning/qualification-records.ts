import { Prisma } from "@prisma/client";
type QualificationRow = {
  id: string;
  personId: string;
  qualification: string;
  validUntil: string | null;
  recognizedQualifications: Prisma.JsonValue;
};
/** Cast legacy expiry values to text before the driver parses DATETIME years 0000–0099. */
export async function personQualifications(tx: Prisma.TransactionClient, personIds?: string[]) {
  if (personIds && !personIds.length) return [];
  const where = personIds
    ? Prisma.sql`WHERE personId IN (${Prisma.join(personIds)})`
    : Prisma.empty;
  const rows = await tx.$queryRaw<QualificationRow[]>(Prisma.sql`
    SELECT id, personId, qualification, CAST(validUntil AS CHAR) AS validUntil,
      recognizedQualifications FROM PersonQualification ${where}
  `);
  return rows.map((row) => ({
    ...row,
    validUntil: row.validUntil?.slice(0, 10) ?? null,
    recognizedQualifications: typeof row.recognizedQualifications === "string"
      ? JSON.parse(row.recognizedQualifications) as Prisma.JsonValue
      : row.recognizedQualifications,
  }));
}

/** Keep the original calendar year; invalid dates must never become an unlimited proof. */
export function storedQualificationDay(value: Date | string): string | null {
  const raw = value instanceof Date
    ? Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : ""
    : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === raw ? raw : null;
}
