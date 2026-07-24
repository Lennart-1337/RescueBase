import { clearPendingLogin, loadPendingLogin, savePendingLogin } from "./pending-login";

describe("pending login storage", () => {
  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("keeps a pending 2FA challenge only for the browser session", () => {
    savePendingLogin({ email: "lager@rescuebase.local", loginChallengeId: "challenge-1", twoFactorMethod: "TOTP" });

    expect(loadPendingLogin()).toEqual({ email: "lager@rescuebase.local", loginChallengeId: "challenge-1", twoFactorMethod: "TOTP" });
    expect(sessionStorage.getItem("rescuebase.pending-login")).toContain("challenge-1");
    expect(localStorage.getItem("rescuebase.pending-login")).toBeNull();
  });

  it("removes pending login data from current and legacy storage", () => {
    sessionStorage.setItem("rescuebase.pending-login", "current");
    localStorage.setItem("rescuebase.pending-login", "legacy");

    clearPendingLogin();

    expect(sessionStorage.getItem("rescuebase.pending-login")).toBeNull();
    expect(localStorage.getItem("rescuebase.pending-login")).toBeNull();
  });
});
