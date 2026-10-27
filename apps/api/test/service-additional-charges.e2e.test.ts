import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest's export= declaration does not match its ESM runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";
jest.setTimeout(120_000);
const base = {
  title: "Freie Posten", customer: "Verein", eventType: "Sport", location: "Köln",
  startsAt: "2026-11-01T08:00:00Z", endsAt: "2026-11-01T10:00:00Z",
  eventStartsAt: "2026-11-01T08:00:00Z", eventEndsAt: "2026-11-01T10:00:00Z",
};
describe("additional service charges persistence", () => {
  let app: INestApplication, close: (() => Promise<void>) | undefined;
  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_service_charges" });
    app = harness.app; close = harness.close;
  });
  afterAll(async () => close?.());
  test("creates, reads, edits and removes charges independently from material discount", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);
    const charge = { id: "travel", label: "Fahrtkosten", amount: "19.95" };
    let service = (await agent.post("/services").send({ ...base, additionalCharges: [charge] }).expect(201)).body;
    expect(service.additionalCharges).toEqual([charge]);
    expect(service.costs.planned.revenue).toBe("54.95");
    service = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(service.additionalCharges).toEqual([charge]);
    service = (await agent.put(`/services/${service.id}`).send({
      version: service.version, materialDiscounted: true,
      additionalCharges: [{ ...charge, amount: "22.50" }, { id: "parking", label: "Parken", amount: "2.00" }],
    }).expect(200)).body;
    expect(service.costs.planned.revenue).toBe("24.50");
    expect(service.costs.actual).toMatchObject({ complete: false, revenue: null, knownRevenue: "24.50" });
    const read = (await agent.get(`/services/${service.id}`).expect(200)).body;
    expect(read.additionalCharges).toEqual(service.additionalCharges);
    service = (await agent.post(`/services/${service.id}/transition`).send({ version: service.version, status: "PLANNING" }).expect(201)).body;
    const statistics = (await agent.get("/services/statistics").expect(200)).body;
    expect(statistics.rows.find((row: { id: string }) => row.id === service.id).costs.planned.revenue).toBe("24.50");
    const csv = await agent.get("/services/statistics.csv").expect(200);
    expect(csv.text).toContain('"24.50"');
    await agent.put(`/services/${service.id}`).send({ version: service.version, additionalCharges: [{ ...charge, amount: "-1" }] }).expect(400);
    service = (await agent.put(`/services/${service.id}`).send({ version: service.version, additionalCharges: [{ ...charge, amount: "0" }] }).expect(200)).body;
    expect(service.costs.planned.revenue).toBe("0.00");
    expect(service.additionalCharges[0].amount).toBe("0");
    service = (await agent.put(`/services/${service.id}`).send({ version: service.version, additionalCharges: [], materialDiscounted: false }).expect(200)).body;
    expect(service.additionalCharges).toEqual([]);
    expect(service.costs.planned.revenue).toBe("35.00");
  });
});
