import { screen } from "@testing-library/react";
import { article, supplier } from "../../test-support/fixtures";
import {
  clickElement,
  renderAppAt,
  resetTestBrowser,
  stubFetch,
} from "../../test-support/app-test-helpers";

describe("Meier reconciliation entry point", () => {
  afterEach(resetTestBrowser);

  it("includes linked articles hidden by the current article search", async () => {
    stubFetch({
      "/api/auth/setup/status": { initialized: true },
      "/api/auth/session": {
        user: {
          id: "admin",
          role: "ADMIN",
          displayName: "Admin",
          email: "admin@example.org",
        },
      },
      "/api/catalog/articles": [
        article,
        {
          ...article,
          id: "meier-hidden",
          name: "Kanülensammler",
          articleUrl:
            "https://www.meier-medizintechnik.de/kanuelensammler/2009068",
        },
      ],
      "/api/catalog/suppliers": [supplier],
    });
    await renderAppAt("/admin/master-data/articles?q=Verband");
    await clickElement(
      await screen.findByRole("button", { name: /Meier.*abgleich/i }),
    );
    expect(
      await screen.findByRole("dialog", { name: /Meier.*abgleich/i }),
    ).toHaveTextContent(/1.*Artikel/);
  });
});
