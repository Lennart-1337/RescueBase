import { calendarDate } from './calendar.js';
import type { GlucoseControlInput } from './types.js';

export function evaluateGlucoseControl(input: GlucoseControlInput): { passed: boolean; reasons: string[] } {
  const measuredOn = calendarDate(input.measuredAt.slice(0, 10));
  const units = ['mg/dL', 'mmol/L'];
  if (!units.includes(input.unit) || !units.includes(input.rangeUnit)) throw new Error('Messwert und Sollbereich benötigen eine unterstützte Einheit.');
  if (![input.lower, input.upper, input.value].every((value) => Number.isFinite(value) && value >= 0) || input.lower > input.upper) {
    throw new Error('Messwert und Sollbereich sind ungültig.');
  }
  const reasons: string[] = [];
  if (input.unit !== input.rangeUnit) reasons.push('Messwert und Sollbereich verwenden unterschiedliche Einheiten.');
  if (input.value < input.lower || input.value > input.upper) reasons.push('Messwert liegt außerhalb des Sollbereichs.');
  if (calendarDate(input.solutionExpiresOn) < measuredOn) reasons.push('Kontrolllösung ist abgelaufen.');
  if (input.stripsExpireOn && calendarDate(input.stripsExpireOn) < measuredOn) reasons.push('Teststreifen sind abgelaufen.');
  return { passed: reasons.length === 0, reasons };
}
