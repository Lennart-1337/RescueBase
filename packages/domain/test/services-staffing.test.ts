import { calculateMaurer, calculateCologne } from "../src/services/staffing.js";

const maurer = {
  capacity: 40000,
  expectedVisitors: 40000,
  indoor: false,
  eventFactor: 0.5,
  protectedVipCount: 0,
  policeViolenceRisk: true,
};
const cologne = {
  durationHours: 10,
  expectedVisitors: 40000,
  riskFactor: 2.25,
  responseTimeMinutes: 5,
  crowdMovement: "SEATED" as const,
  regularAmbulanceTransports: 20,
  regularEmergencyDoctorCalls: 0,
  ambulanceBusyHours: 1,
  emergencyDoctorBusyHours: 1,
  zones: [
    { id: "a", expectedVisitors: 20000, riskFactor: 2.25 },
    { id: "b", expectedVisitors: 20000, riskFactor: 2.25 },
  ],
};

describe("source-versioned staffing assessments", () => {
  test("reproduces vfdb Deutzer Werft Maurer example: 54.5 points", () => {
    const result = calculateMaurer(maurer);
    expect(result.status).toBe("COMPLETE");
    expect(result.metrics.score).toBe(54.5);
    expect(result.recommendation).toMatchObject({
      helpers: 30,
      ktw: 4,
      rtw: 3,
      emergencyDoctors: 2,
    });
    expect(result.recommendation?.treatmentStation).toMatchObject({
      treatmentPlaces: 5,
      restPlaces: 10,
    });
    expect(result.methodVersion).toBeTruthy();
    expect(result.sourceUrls.length).toBeGreaterThan(0);
  });
  test("reproduces vfdb Cologne frequency and transport examples", () => {
    const result = calculateCologne(cologne);
    expect(result.metrics).toMatchObject({
      expectedPresentations: 180,
      presentationsPerHour: 18,
      expectedAmbulanceTransports: 36,
      expectedEmergencyDoctorCalls: 3.6,
      maximumWalkingDistanceMeters: 500,
    });
    expect(result.recommendation).toMatchObject({
      rtw: 2,
      emergencyDoctors: 1,
    });
    expect(result.zones?.map((zone) => zone.presentationsPerHour)).toEqual([
      9, 9,
    ]);
    expect(result.zones?.[0]?.treatmentStation).toBe("UHS_1_5");
  });
  test("does not invent missing capacity, risk, geography or rescue-service availability", () => {
    expect(calculateMaurer({}).status).toBe("INCOMPLETE");
    const result = calculateCologne({
      durationHours: 2,
      expectedVisitors: 500,
    });
    expect(result.status).toBe("INCOMPLETE");
    expect(result.missingFields).toContain("regularAmbulanceTransports");
    expect(result.recommendation).toBeUndefined();
  });
  test("rejects invalid provided values even in incomplete drafts", () => {
    expect(() => calculateMaurer({ expectedVisitors: -1 })).toThrow();
    expect(() => calculateMaurer({ ...maurer, capacity: 39999 })).toThrow();
    expect(() =>
      calculateMaurer({ ...maurer, indoor: "false" as never }),
    ).toThrow();
    expect(() => calculateCologne({ riskFactor: NaN })).toThrow();
    expect(() => calculateCologne({ ...cologne, zones: [] })).toThrow();
    expect(() =>
      calculateCologne({ ...cologne, zones: [cologne.zones[0]!] }),
    ).toThrow();
  });
  test("table boundaries do not leave decimal gaps; >140 needs individual assessment", () => {
    const at = calculateMaurer({
      ...maurer,
      eventFactor: 13.5 / 89,
      policeViolenceRisk: false,
    });
    const above = calculateMaurer({
      ...maurer,
      eventFactor: 13.51 / 89,
      policeViolenceRisk: false,
    });
    expect(at.recommendation?.helpers).toBe(5);
    expect(above.recommendation?.helpers).toBe(10);
    expect(calculateMaurer({ ...maurer, eventFactor: 3 }).status).toBe(
      "INCOMPLETE",
    );
  });
  test("preserves low-volume warning and always requires professional review", () => {
    const result = calculateCologne({
      ...cologne,
      expectedVisitors: 500,
      zones: [{ id: "a", expectedVisitors: 500, riskFactor: 1 }],
      riskFactor: 1,
    });
    expect(result.warnings).toContain("OUTSIDE_REFERENCE_POPULATION");
    expect(result.requiresProfessionalReview).toBe(true);
  });
  test("subtracts known regular service capacity without producing negative vehicles", () => {
    expect(
      calculateCologne({
        ...cologne,
        regularAmbulanceTransports: 1000,
        regularEmergencyDoctorCalls: 1000,
      }).recommendation?.rtw,
    ).toBe(0);
  });
});
