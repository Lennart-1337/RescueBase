import { inspectionDueDate, validateInspectionCompletion } from "../src/services/mpg-inspection-evidence.js";

describe("MPG inspection completion", () => {
  it.each(["STK", "MTK"])("requires a full protocol and marking confirmation for a successful %s", kind => {
    expect(() => validateInspectionCompletion({ kind, result: "PASSED", reportDocumentId: null, protocolConfirmed: true, markingConfirmed: true })).toThrow(/Prüfprotokoll/);
    expect(() => validateInspectionCompletion({ kind, result: "PASSED", reportDocumentId: "report", protocolConfirmed: false, markingConfirmed: true })).toThrow(/Messwerte/);
    expect(() => validateInspectionCompletion({ kind, result: "PASSED", reportDocumentId: "report", protocolConfirmed: true, markingConfirmed: false })).toThrow(/Kennzeichnung/);
    expect(() => validateInspectionCompletion({ kind, result: "PASSED", reportDocumentId: "report", protocolConfirmed: true, markingConfirmed: true })).not.toThrow();
  });

  it("requires a protocol but no success marking for a failed STK", () => {
    expect(() => validateInspectionCompletion({ kind: "STK", result: "FAILED", reportDocumentId: null, protocolConfirmed: true, markingConfirmed: false })).toThrow(/Prüfprotokoll/);
    expect(() => validateInspectionCompletion({ kind: "STK", result: "FAILED", reportDocumentId: "report", protocolConfirmed: true, markingConfirmed: false })).not.toThrow();
  });

  it("allows a complete maintenance record without an uploaded technical protocol", () => {
    expect(() => validateInspectionCompletion({ kind: "MAINTENANCE", result: "PASSED", reportDocumentId: null, protocolConfirmed: false, markingConfirmed: false })).not.toThrow();
  });
});

describe("MPG inspection due dates", () => {
  it("uses the documented model interval without a second manual entry", () => {
    expect(inspectionDueDate({ kind: "STK", performedOn: "2026-09-14", intervalMonths: 24 })).toBe("2028-09-30");
  });
  it("requires a reason and source for an earlier exception", () => {
    expect(() => inspectionDueDate({ kind: "STK", performedOn: "2026-09-14", intervalMonths: 24, requested: "2027-09-30" })).toThrow(/Begründung und Quelle/);
    expect(inspectionDueDate({ kind: "STK", performedOn: "2026-09-14", intervalMonths: 24, requested: "2027-09-30", reason: "Häufige Nutzung", source: "Risikobewertung 2026" })).toBe("2027-09-30");
  });
  it("never accepts a date later than the documented maximum", () => {
    expect(() => inspectionDueDate({ kind: "MTK", performedOn: "2026-09-14", intervalMonths: 24, requested: "2029-01-01", reason: "Wunsch", source: "Intern" })).toThrow(/verlängern/);
  });
});
