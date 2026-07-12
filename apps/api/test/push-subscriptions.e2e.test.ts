import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(45_000);

describe("push subscriptions", () => {
  let app: INestApplication;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    process.env.VAPID_PUBLIC_KEY = "BEl6sGe2zCNxzyu2WQwo5XBmhGuVJ9By0DxwYhucPzQdV0aQJ42T7e1zNPp5PvYx6N6WmXv3mM4aN5bQv4rKxY";
    process.env.VAPID_PRIVATE_KEY = "J6oXq0cY_QkBA0q0z1mJDl6gOXR0VNkF4Yf5OQoOEgM";
    process.env.VAPID_SUBJECT = "mailto:admin@example.org";
    const harness = await bootstrapTestApp({ databaseName: "rescuebase_push_test" });
    app = harness.app;
    closeApp = harness.close;
  });

  afterAll(async () => {
    await closeApp?.();
  });

  it("stores and removes the current user's browser subscription", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);

    const subscription = {
      endpoint: "https://push.example.org/subscriptions/device-1",
      keys: { auth: "test-auth-key", p256dh: "test-p256dh-key" }
    };
    await agent.post("/push/subscriptions").send(subscription).expect(201);
    expect((await agent.get("/push/subscriptions/me").expect(200)).body.endpoints).toEqual([subscription.endpoint]);

    await agent.delete("/push/subscriptions").send({ endpoint: subscription.endpoint }).expect(200);
    expect((await agent.get("/push/subscriptions/me").expect(200)).body.endpoints).toEqual([]);
  });
});
