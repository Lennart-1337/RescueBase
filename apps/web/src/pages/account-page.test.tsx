import { screen } from "@testing-library/react";
import { clickElement, renderAppAt, resetTestBrowser, stubFetch } from "../test-support/app-test-helpers";

describe("AccountPage", () => {
  afterEach(resetTestBrowser);

  it("renders a TOTP QR code after preparing 2FA", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true, firstAdminEmail: "admin@rescuebase.local" },
      "/api/auth/session": { user: { id: "user-admin", email: "admin@rescuebase.local", displayName: "Admin", role: "ADMIN", twoFactorEnabled: false } },
      "/api/auth/2fa/totp/setup": { secret: "ABCDEF123456", otpauthUrl: "otpauth://totp/RescueBase:admin@rescuebase.local?secret=ABCDEF123456&issuer=RescueBase" }
    });
    await renderAppAt("/admin/account");
    await clickElement(await screen.findByRole("button", { name: /TOTP vorbereiten/ }));
    expect(await screen.findByAltText("TOTP-QR-Code")).toBeInTheDocument();
    expect(screen.getByText("ABCDEF123456")).toBeInTheDocument();
  });
});
