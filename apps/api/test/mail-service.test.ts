import { jest } from "@jest/globals";
import { MailService } from "../src/services/mail.service";

describe("MailService", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM;

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM;
    else process.env.RESEND_FROM = originalFrom;
    jest.restoreAllMocks();
  });

  it("returns debug data when no Resend API key is configured", async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;

    const result = await new MailService().sendPasswordReset("lager@rescuebase.local", "http://localhost/reset-123");

    expect(result).toEqual({ debugUrl: "http://localhost/reset-123" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends through Resend when an API key is configured", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.RESEND_FROM = "RescueBase <noreply@projecty.cc>";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => ""
    });
    global.fetch = fetchMock as typeof fetch;

    const result = await new MailService().sendEmailTwoFactorCode("lager@rescuebase.local", "123456");

    expect(result).toEqual({});
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({
        Authorization: "Bearer re_test_123",
        "Content-Type": "application/json"
      })
    }));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      from: "RescueBase <noreply@projecty.cc>",
      to: ["lager@rescuebase.local"],
      subject: "RescueBase Sicherheitscode",
      html: expect.stringContaining("RB")
    });
  });

  it("renders a branded call-to-action email for password resets", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => ""
    });
    global.fetch = fetchMock as typeof fetch;

    await new MailService().sendPasswordReset("lager@rescuebase.local", "https://rescuebase.local/reset-123");

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toMatchObject({
      subject: "RescueBase Passwort zurücksetzen",
      html: expect.stringContaining("Passwort zurücksetzen")
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).html).toContain("https://rescuebase.local/reset-123");
  });
});
