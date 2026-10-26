import { screen } from "@testing-library/react";
import {
  renderAppAt,
  resetTestBrowser,
  stubFetch,
  wasRequested,
} from "../../test-support/app-test-helpers";
import { catalogFixture, serviceFixture } from "./test-fixtures";
const base = {
  "/api/auth/setup/status": { initialized: true },
  "/api/services": [serviceFixture],
  "/api/services/catalog": catalogFixture,
  "/api/services/service-1": serviceFixture,
};
function session(role: "ADMIN" | "WAREHOUSE", servicesManage = false) {
  return {
    user: {
      id: "user-1",
      displayName: "Planung",
      email: "plan@example.org",
      role,
      servicesManage,
      medicalDevicesManage: false,
      twoFactorEnabled: false,
    },
  };
}
describe("integrated services route", () => {
  afterEach(resetTestBrowser);
  it("renders the shared shell and the complete service detail navigation", async () => {
    stubFetch({ ...base, "/api/auth/session": session("ADMIN") });
    await renderAppAt("/admin/services?service=service-1");
    expect(screen.queryByRole("heading", { name: "Dienste" })).toBeNull();
    expect(
      await screen.findByRole("heading", { name: "Sanitätsdienst Stadtlauf" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Hauptnavigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tablist", { name: "Dienstbereiche" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Nachbereitung" }),
    ).toBeInTheDocument();
  });
  it("does not request service or personnel data without permission", async () => {
    stubFetch({
      ...base,
      "/api/auth/session": session("WAREHOUSE"),
      "/api/service-permissions/me": { servicesManage: false },
      "/api/mpg-permissions/me": { medicalDevicesManage: false },
    });
    await renderAppAt("/admin/services");
    expect(
      await screen.findByRole("heading", {
        name: "Keine Berechtigung für die Dienstverwaltung",
      }),
    ).toBeInTheDocument();
    expect(wasRequested("/api/services", "GET")).toBe(false);
    expect(wasRequested("/api/services/catalog", "GET")).toBe(false);
  });
});
