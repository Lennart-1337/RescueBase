import type { INestApplication } from "@nestjs/common";
import { jest } from "@jest/globals";
import { authenticator } from "otplib";
import request from "supertest";
import { bootstrapTestApp } from "./bootstrap-test-app.js";

jest.setTimeout(30_000);

describe("auth lifecycle", () => {
  let app: INestApplication;
  let closeApp: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const harness = await bootstrapTestApp({
      appPublicUrl: "http://localhost:5173",
      databaseName: "rescuebase_auth_test",
      mailProvider: "console"
    });
    app = harness.app;
    closeApp = harness.close;
  });

  afterAll(async () => {
    await closeApp?.();
  });

  it("invites, activates, resets password, and handles both email and TOTP 2FA", async () => {
    const server = app.getHttpServer();
    const admin = request.agent(server);
    await admin.post("/auth/login").send({ email: "admin@rescuebase.local", password: "rescuebase-admin" }).expect(201);

    const invitation = await admin.post("/auth/invite").send({
      email: "lager-neu@rescuebase.local",
      displayName: "Neues Lagerteam",
      role: "WAREHOUSE"
    }).expect(201);
    const invitationToken = invitation.body.invitationUrl.split("/").pop();
    expect(invitationToken).toBeTruthy();

    await request(server).get(`/auth/invitations/${invitationToken}`).expect(200);

    const invitedUser = request.agent(server);
    await invitedUser.post("/auth/invitations/accept").send({
      token: invitationToken,
      password: "rescuebase-neu",
      displayName: "Lager Nord"
    }).expect(201);
    await invitedUser.get("/auth/session").expect(200);

    const reset = await request(server)
      .post("/auth/password-reset/request")
      .send({ email: "lager-neu@rescuebase.local" })
      .expect(201);
    const resetToken = reset.body.debugUrl.split("/").pop();
    expect(resetToken).toBeTruthy();
    await request(server).get(`/auth/password-reset/${resetToken}`).expect(200);
    await request(server)
      .post("/auth/password-reset/confirm")
      .send({ token: resetToken, password: "rescuebase-neu-2" })
      .expect(201);

    await request(server)
      .post("/auth/login")
      .send({ email: "lager-neu@rescuebase.local", password: "rescuebase-neu-2" })
      .expect(201);

    const warehouse = request.agent(server);
    await warehouse.post("/auth/login").send({ email: "lager-neu@rescuebase.local", password: "rescuebase-neu-2" }).expect(201);

    const emailChallenge = await warehouse.post("/auth/2fa/email/start").send({}).expect(201);
    await warehouse.post("/auth/2fa/email/enable").send({
      challengeId: emailChallenge.body.challengeId,
      code: emailChallenge.body.debugCode
    }).expect(201);
    await warehouse.post("/auth/logout").expect(201);

    const emailLoginStart = await request(server).post("/auth/login").send({
      email: "lager-neu@rescuebase.local",
      password: "rescuebase-neu-2"
    }).expect(201);
    expect(emailLoginStart.body.requiresTwoFactor).toBe(true);
    expect(emailLoginStart.body.twoFactorMethod).toBe("EMAIL");
    await request(server).post("/auth/login").send({
      email: "lager-neu@rescuebase.local",
      password: "rescuebase-neu-2",
      emailChallengeId: emailLoginStart.body.emailChallengeId,
      twoFactorCode: emailLoginStart.body.debugCode
    }).expect(201);

    const totpSetup = await admin.post("/auth/2fa/totp/setup").send({}).expect(201);
    const totpCode = authenticator.generate(totpSetup.body.secret);
    await admin.post("/auth/2fa/totp/enable").send({ code: totpCode }).expect(201);
    await admin.post("/auth/logout").expect(201);

    const totpStart = await request(server).post("/auth/login").send({
      email: "admin@rescuebase.local",
      password: "rescuebase-admin"
    }).expect(201);
    expect(totpStart.body.requiresTwoFactor).toBe(true);
    expect(totpStart.body.twoFactorMethod).toBe("TOTP");
    await request(server).post("/auth/login").send({
      email: "admin@rescuebase.local",
      password: "rescuebase-admin",
      twoFactorCode: authenticator.generate(totpSetup.body.secret)
    }).expect(201);
  });
});
