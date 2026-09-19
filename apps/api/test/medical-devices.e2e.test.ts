import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(45_000);

describe("medical devices", () => {
  let app: INestApplication;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_medical_devices_test" });
    app = harness.app;
    closeApp = harness.close;
  });

  afterAll(async () => {
    await closeApp?.();
  });

  it("keeps the existing catalog device flow unchanged", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);

    await agent
      .post("/catalog/devices")
      .send({ name: "Corpuls C3", articleId: "article-tourniquet", locationId: "loc-main", active: true })
      .expect(201);

    const listed = await agent.get("/catalog/devices").expect(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].articleId).toBe("article-tourniquet");

    await agent.delete(`/catalog/devices/${listed.body[0].id}`).expect(200, { ok: true });
    await agent.get("/catalog/devices").expect(200, []);
  });
});
