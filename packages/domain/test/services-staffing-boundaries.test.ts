import { calculateMaurer, calculateCologne } from "../src/services/staffing.js";
// Willich 07/1329 p. 2–4 and IVR 2017 appendix 4; two base points.
const scoreInput = {
  capacity: 500,
  expectedVisitors: 500,
  indoor: false,
  protectedVipCount: 0,
  policeViolenceRisk: false,
};
const atScore = (score: number) =>
  calculateMaurer({ ...scoreInput, eventFactor: score / 2 });
const cologne = {
  durationHours: 10,
  expectedVisitors: 100000,
  riskFactor: 1,
  responseTimeMinutes: 5,
  crowdMovement: "DENSE" as const,
  regularAmbulanceTransports: 0,
  regularEmergencyDoctorCalls: 0,
  ambulanceBusyHours: 1,
  emergencyDoctorBusyHours: 1,
  zones: [{ id: "one", expectedVisitors: 100000, riskFactor: 1 }],
};
describe("Maurer published table edges", () => {
  test.each([
    [2, 0, 3],
    [4, 3, 5],
    [13.5, 5, 10],
    [22, 10, 20],
    [40, 20, 30],
    [60, 30, 40],
    [80, 40, 80],
    [100, 80, 100],
    [110, 100, 120],
    [120, 120, 160],
  ])("helpers at %s and above", (score, below, above) => {
    expect(atScore(score).recommendation?.helpers).toBe(below);
    expect(atScore(score + 0.001).recommendation?.helpers).toBe(above);
  });
  test.each([
    [4, 0, 1],
    [13, 1, 2],
    [25, 2, 3],
    [40, 3, 4],
    [60, 4, 5],
    [80, 5, 6],
    [100, 6, 7],
    [110, 7, 8],
    [120, 8, 10],
  ])("KTW at %s and above", (score, below, above) => {
    expect(atScore(score).recommendation?.ktw).toBe(below);
    expect(atScore(score + 0.001).recommendation?.ktw).toBe(above);
  });
  test.each([
    [6, 0, 1],
    [25.5, 1, 2],
    [45.5, 2, 3],
    [60.5, 3, 4],
    [75.5, 4, 5],
    [100, 5, 6],
    [120, 6, 7],
  ])("RTW at %s and above", (score, below, above) => {
    expect(atScore(score).recommendation?.rtw).toBe(below);
    expect(atScore(score + 0.001).recommendation?.rtw).toBe(above);
  });
  test.each([
    [13, 0, 1],
    [30, 1, 2],
    [60, 2, 3],
    [90, 3, 4],
    [120, 4, 5],
  ])("doctors at %s and above", (score, below, above) => {
    expect(atScore(score).recommendation?.emergencyDoctors).toBe(below);
    expect(atScore(score + 0.001).recommendation?.emergencyDoctors).toBe(above);
  });
  test.each([
    [0, 0],
    [1, 2],
    [4, 8],
    [5, 10],
    [6, 12],
    [15, 30],
    [16, 30],
  ])("VIP proportional rule %s -> %s", (count, points) => {
    const result = calculateMaurer({
      ...scoreInput,
      eventFactor: 1,
      protectedVipCount: count,
    });
    expect(result.metrics.vipScore).toBe(points);
    if (count % 5)
      expect(result.warnings).toContain(
        "VIP_PROPORTIONAL_INTERPRETATION_REQUIRES_REVIEW",
      );
    expect(result.methodVersion).toContain("WILLICH_2007");
  });
  test("stations and leadership remain separate from mobile helpers and vehicle crews", () => {
    expect(atScore(50).recommendation?.treatmentStation).toBeUndefined();
    expect(atScore(50.001).recommendation?.treatmentStation?.helpers).toBe(5);
    expect(atScore(80.001).recommendation?.treatmentStation?.helpers).toBe(10);
    expect(atScore(110.001).recommendation?.treatmentStation?.helpers).toBe(12);
    expect(atScore(30).recommendation?.command).toBe("NONE");
    expect(atScore(30.001).recommendation?.command).toBe("REDUCED_STAFF");
    expect(atScore(60.001).recommendation?.command).toBe("FULL_STAFF");
    expect(atScore(140).recommendation?.helpers).toBe(160);
    expect(atScore(140.001).recommendation).toBeUndefined();
  });
});
describe("Cologne documented interpretations", () => {
  test("NEF is 10 percent of RTW, resolving the ambiguous 2007 table via 2010 worked example", () => {
    const result = calculateCologne(cologne);
    expect(result.metrics.expectedPresentations).toBe(200);
    expect(result.metrics.expectedEmergencyDoctorCalls).toBe(4);
    expect(result.sourceUrls).toContain(
      "https://www.vfdb.de/media/doc/sonstiges/forschung/eva/vergleich_maurer_koelner_algorithmus.pdf",
    );
    expect(result.warnings).toContain(
      "SOURCE_TABLE_CONTAINS_AMBIGUOUS_THRESHOLDS",
    );
  });
  test.each([
    [4, "MOBILE_1_1"],
    [8, "UHS_1_5"],
    [10, "UHS_1_1_8"],
  ])("inclusive upper resource tier at %s/h", (frequency, tier) => {
    const visitors = (frequency as number) / 0.0002;
    const result = calculateCologne({
      ...cologne,
      expectedVisitors: visitors,
      zones: [{ id: "one", expectedVisitors: visitors, riskFactor: 1 }],
    });
    expect(result.zones?.[0]?.treatmentStation).toBe(tier);
  });
  test("accepts decimal duration and factors, never missing rescue-service capacity", () => {
    expect(
      calculateCologne({
        ...cologne,
        durationHours: 1.5,
        riskFactor: 1.25,
        zones: [{ ...cologne.zones[0]!, riskFactor: 1.25 }],
      }).metrics.expectedPresentations,
    ).toBe(37.5);
    expect(
      calculateCologne({ ...cologne, regularAmbulanceTransports: undefined })
        .status,
    ).toBe("INCOMPLETE");
  });
});
