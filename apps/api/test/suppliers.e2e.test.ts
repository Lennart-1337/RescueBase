import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
// @ts-expect-error supertest ships export= typings; default import is correct with ts-jest runtime.
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(45_000);

describe("suppliers", () => {
  let app: INestApplication;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapTestApp({
      databaseName: "rescuebase_suppliers_test",
    });
    app = harness.app;
    closeApp = harness.close;
  });

  afterAll(async () => {
    await closeApp?.();
  });

  it("creates, lists, and updates suppliers with contact details", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);

    const created = await agent.post("/catalog/suppliers").send({
      name: "NordMed",
      contactPerson: "Anna Meier",
      email: "bestellung@nordmed.example",
      phone: "+49 40 123456",
      website: "https://nordmed.example",
      street: "Musterstraße 5",
      postalCode: "20095",
      city: "Hamburg",
      country: "Deutschland",
      notes: "Bestellungen bevorzugt per E-Mail",
    }).expect(201);

    expect(created.body).toMatchObject({
      name: "NordMed",
      contactPerson: "Anna Meier",
      email: "bestellung@nordmed.example",
      phone: "+49 40 123456",
      website: "https://nordmed.example/",
      street: "Musterstraße 5",
      postalCode: "20095",
      city: "Hamburg",
      country: "Deutschland",
      notes: "Bestellungen bevorzugt per E-Mail",
    });

    const listed = await agent.get("/catalog/suppliers").expect(200);
    expect(listed.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: created.body.id,
          name: "NordMed",
          email: "bestellung@nordmed.example",
          phone: "+49 40 123456",
        }),
      ]),
    );

    const updated = await agent
      .patch(`/catalog/suppliers/${created.body.id}`)
      .send({
        name: "NordMed Pro",
        contactPerson: "Anna Meier",
        email: "einkauf@nordmed.example",
        phone: "",
        website: "https://shop.nordmed.example",
        street: "Musterstraße 6",
        postalCode: "20095",
        city: "Hamburg",
        country: "Deutschland",
        notes: "",
      })
      .expect(200);

    expect(updated.body).toMatchObject({
      name: "NordMed Pro",
      contactPerson: "Anna Meier",
      email: "einkauf@nordmed.example",
      phone: null,
      website: "https://shop.nordmed.example/",
      street: "Musterstraße 6",
      postalCode: "20095",
      city: "Hamburg",
      country: "Deutschland",
      notes: null,
    });
  });

  it("rejects invalid supplier contact formats", async () => {
    const agent = request.agent(app.getHttpServer());
    await agent
      .post("/auth/login")
      .send({ email: "admin@rescuebase.local", password: "rescuebase-admin" })
      .expect(201);

    await agent
      .post("/catalog/suppliers")
      .send({ name: "Format Test", email: "ungueltig", website: "ftp://example.org" })
      .expect(400);
  });
});
