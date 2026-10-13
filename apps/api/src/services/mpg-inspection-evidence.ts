import { BadRequestException } from "@nestjs/common";
import { calculateMpgDueDate, calendarDate } from "@rescuebase/domain";

export type InspectionCompletion = {
  kind: string;
  result: string;
  reportDocumentId?: string | null;
  protocolConfirmed: boolean;
  markingConfirmed: boolean;
};

export function validateInspectionCompletion(input: InspectionCompletion) {
  if (input.kind !== "STK" && input.kind !== "MTK") return;
  if (!input.reportDocumentId) throw new BadRequestException("Für STK und MTK muss ein Prüfprotokoll hinterlegt sein.");
  if (!input.protocolConfirmed) throw new BadRequestException("Bitte bestätigen, dass das Prüfprotokoll Messwerte, Messverfahren und Beurteilung enthält.");
  if (input.result === "PASSED" && !input.markingConfirmed) {
    throw new BadRequestException("Bitte die vorgeschriebene Kennzeichnung am Gerät bestätigen.");
  }
}

export function inspectionDueDate(input: { kind: string; performedOn: string; intervalMonths?: number | null; requested?: string | null; reason?: string | null; source?: string | null }): string | null {
  const automatic = input.intervalMonths ? calculateMpgDueDate(input.kind, input.performedOn, input.intervalMonths) : null;
  if (!input.requested) return automatic;
  let requested: string;
  try { requested = calendarDate(input.requested); } catch { throw new BadRequestException("Ungültige nächste Fälligkeit."); }
  if (requested <= input.performedOn) throw new BadRequestException("Die nächste Fälligkeit muss nach der Prüfung liegen.");
  if (automatic && requested > automatic) throw new BadRequestException("Die nächste Fälligkeit darf das festgelegte Intervall nicht verlängern.");
  if (requested !== automatic && (!input.reason?.trim() || !input.source?.trim())) {
    throw new BadRequestException("Für eine abweichende Fälligkeit sind Begründung und Quelle erforderlich.");
  }
  return requested;
}
