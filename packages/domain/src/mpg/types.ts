export type MpgDeviceStatus = 'DRAFT' | 'BLOCKED' | 'RELEASED' | 'RETIRED';
export interface MpgDeviceEvaluationInput {
  requirementsReviewed: boolean;
  releasedAt?: string | null;
  retiredAt?: string | null;
  requirements: { id: string; mandatory: boolean; dueDate?: string | null }[];
  inspections: { requirementId: string; result: 'PASSED' | 'FAILED'; performedAt: string; finalizedAt?: string | null }[];
  incidents: { id: string; safetyRelevant: boolean; resolvedAt?: string | null }[];
  glucoseControls?: { id: string; performedAt: string; passed: boolean; resolution?: string | null }[];
}
export interface MpgDeviceEvaluation { status: MpgDeviceStatus; reasons: string[] }
export interface GlucoseControlInput {
  measuredAt: string;
  unit: string;
  rangeUnit: string;
  lower: number;
  upper: number;
  value: number;
  solutionExpiresOn: string;
  stripsExpireOn?: string;
}
