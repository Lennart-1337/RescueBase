const STORAGE_KEY = "rescuebase.pending-login";

export type PendingLoginState = {
  email: string;
  debugCode: string;
  loginChallengeId: string;
  twoFactorMethod: "TOTP" | "EMAIL";
};

export function loadPendingLogin(): PendingLoginState | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const state = JSON.parse(value) as Partial<PendingLoginState>;
    if (!state.email || !state.loginChallengeId || !state.twoFactorMethod) return null;
    if (state.twoFactorMethod !== "TOTP" && state.twoFactorMethod !== "EMAIL") return null;
    return { email: state.email, debugCode: state.debugCode ?? "", loginChallengeId: state.loginChallengeId, twoFactorMethod: state.twoFactorMethod };
  } catch {
    return null;
  }
}

export function savePendingLogin(state: PendingLoginState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPendingLogin() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
