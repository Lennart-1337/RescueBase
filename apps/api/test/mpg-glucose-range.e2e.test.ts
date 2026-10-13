import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(45_000);

describe("MPG BZ range documentation", () => {
  let app: INestApplication;
  let close: (() => Promise<void>) | undefined;
  beforeAll(async () => { const harness = await bootstrapTestApp({ databaseName: "rescuebase_mpg_glucose_test" }); app = harness.app; close = harness.close; });
  afterAll(async () => close?.());

  it("uses a documented control-medium range and snapshots it on every measurement", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    const model = await agent.post("/mpg/models").send({ name: "BZ-Test", manufacturer: "Test", manufacturerAddress: "Berlin", productType: "Blutzucker" }).expect(201);
    const range = await agent.post(`/mpg/models/${model.body.id}/glucose-ranges`).send({
      solutionName: "Kontrolllösung", solutionLot: "LOT-1", solutionExpiresAt: "2025-12-31", stripLot: "STRIP-1",
      controlLevel: "Normal", unit: "mg/dL", targetMin: 80, targetMax: 120, source: "Herstellerangabe zur Charge LOT-1"
    }).expect(201);
    const device = await agent.post("/mpg/devices").send({ name: "BZ 1", mpgModelId: model.body.id, locationId: "loc-main" }).expect(201);
    const person = await agent.post("/mpg/people").send({ name: "BZ Prüfperson", birthDate: "1990-01-01" }).expect(201);
    const control = await agent.post(`/mpg/devices/${device.body.id}/glucose-controls`).send({
      glucoseRangeId: range.body.id, performedAt: "2025-09-22", personId: person.body.id, value: 100
    }).expect(201);
    expect(control.body).toMatchObject({ solutionLot: "LOT-1", stripLot: "STRIP-1", controlLevel: "Normal",
      unit: "mg/dL", targetUnit: "mg/dL", targetMin: 80, targetMax: 120, passed: true });
    await agent.post(`/mpg/devices/${device.body.id}/glucose-controls`).send({
      glucoseRangeId: range.body.id, performedAt: "2025-09-22", personId: person.body.id, value: 101, targetMax: 200
    }).expect(400);
    const expired = await agent.post(`/mpg/models/${model.body.id}/glucose-ranges`).send({
      solutionName: "Kontrolllösung", solutionLot: "LOT-ALT", solutionExpiresAt: "2025-08-31", stripLot: "STRIP-1",
      controlLevel: "Normal", unit: "mg/dL", targetMin: 80, targetMax: 120, source: "Herstellerangabe zur Charge LOT-ALT"
    }).expect(201);
    const failed = await agent.post(`/mpg/devices/${device.body.id}/glucose-controls`).send({
      glucoseRangeId: expired.body.id, performedAt: "2025-09-22", personId: person.body.id, value: 100
    }).expect(201);
    expect(failed.body).toMatchObject({ passed: false, solutionLot: "LOT-ALT" });
  });
});
