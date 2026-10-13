import { calendarDate } from './calendar.js';
import type { MpgDeviceEvaluation, MpgDeviceEvaluationInput } from './types.js';

export function evaluateMpgDevice(input: MpgDeviceEvaluationInput, today: string): MpgDeviceEvaluation {
  calendarDate(today);
  const reasons: string[] = [];
  if (input.retiredAt) return { status: 'RETIRED', reasons: [] };
  if (!input.requirementsReviewed) reasons.push('Prüfanforderungen sind noch nicht geprüft.');
  const requirementNames = new Map(input.requirements.map((requirement) => [requirement.id, requirement.title?.trim() || requirement.id]));
  for (const requirement of input.requirements) {
    if (!requirement.mandatory) continue;
    const name = requirementNames.get(requirement.id)!;
    if (!requirement.dueDate) reasons.push(`Pflichtprüfung ${name}: Fälligkeit fehlt.`);
    else if (calendarDate(requirement.dueDate) < today) reasons.push(`Pflichtprüfung ${name} ist überfällig.`);
  }
  const latest = new Map<string, MpgDeviceEvaluationInput['inspections'][number]>();
  for (const inspection of input.inspections) {
    if (!inspection.finalizedAt) continue;
    const previous = latest.get(inspection.requirementId);
    if (!previous || instant(inspection.performedAt) > instant(previous.performedAt) ||
      (instant(inspection.performedAt) === instant(previous.performedAt) && instant(inspection.finalizedAt) > instant(previous.finalizedAt!))) {
      latest.set(inspection.requirementId, inspection);
    }
  }
  for (const inspection of latest.values()) {
    if (inspection.result === 'FAILED') reasons.push(`Prüfung ${requirementNames.get(inspection.requirementId) ?? inspection.requirementId} wurde nicht bestanden.`);
  }
  for (const incident of input.incidents) {
    if (incident.safetyRelevant && !incident.resolvedAt) reasons.push(`Sicherheitsrelevanter Defekt ${incident.id} ist offen.`);
  }
  const controls = input.glucoseControls ?? [];
  for (const failure of controls.filter((control) => !control.passed)) {
    const successfulRetry = controls.some((control) => control.passed && instant(control.performedAt) > instant(failure.performedAt));
    if (!failure.resolution?.trim() || !successfulRetry) reasons.push(`BZ-Kontrolle ${failure.id}: Klärung und erfolgreiche Wiederholung erforderlich.`);
  }
  if (reasons.length) return { status: !input.requirementsReviewed && reasons.length === 1 ? 'DRAFT' : 'BLOCKED', reasons };
  return { status: input.releasedAt ? 'RELEASED' : 'DRAFT', reasons: input.releasedAt ? [] : ['Dokumentierte Freigabe fehlt.'] };
}

function instant(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error("Invalid evidence timestamp.");
  return timestamp;
}
